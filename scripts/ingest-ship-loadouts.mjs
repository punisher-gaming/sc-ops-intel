#!/usr/bin/env node
// One-off ingest: ship hardpoint + component slot configs from
// scunpacked-data /ships JSONs. Populates ships.ship_loadout jsonb so
// /meta-loadouts can surface every flyable hull, not just the 12 we
// hand-curated.
//
// scunpacked-data ship JSONs include nested Ports describing every
// mount on the ship — weapons, missiles, shields, power plants,
// coolers, quantum drives, etc. We walk the tree, pull the ports we
// care about, classify them, and upsert the structured loadout.
//
// Usage:
//   node scripts/ingest-ship-loadouts.mjs
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY in .env.local.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function loadEnv() {
  try {
    const raw = readFileSync(path.join(REPO_ROOT, ".env.local"), "utf8");
    const out = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...loadEnv(), ...process.env };
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// scunpacked-data hosts ship JSONs under v2/ships/. Each file is a
// flattened export of the in-game ship config including hardpoints.
const REPO = "StarCitizenWiki/scunpacked-data";
const SHIPS_PATH = "ships";
const GH_API = `https://api.github.com/repos/${REPO}/contents/${SHIPS_PATH}`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/master/${SHIPS_PATH}`;

// Port-type keywords for classification. scunpacked uses dotted types
// like "WeaponGun.Gun" or "Shield.Shield" — we match the prefix.
const WEAPON_TYPE_PREFIXES = [
  "weapongun",
  "missilelauncher",
  "turret",
  "weaponmounted",
];
const COMPONENT_TYPE_MAP = {
  shield: "shield",
  shieldgenerator: "shield",
  powerplant: "powerplant",
  cooler: "cooler",
  quantumdrive: "quantum",
};

function typesIncludeWeapon(types) {
  if (!Array.isArray(types)) return false;
  return types.some((t) => {
    const lower = String(t).toLowerCase();
    return WEAPON_TYPE_PREFIXES.some((p) => lower.startsWith(p));
  });
}

function typesIncludeComponent(types) {
  if (!Array.isArray(types)) return null;
  for (const t of types) {
    const head = String(t).toLowerCase().split(".")[0];
    if (COMPONENT_TYPE_MAP[head]) return COMPONENT_TYPE_MAP[head];
  }
  return null;
}

// Mount classification — fixed vs gimbal vs turret. scunpacked
// usually puts this in the port's Loadout default or in subtypes.
function detectMount(port) {
  const tags = (port.Tags || []).map((t) => String(t).toLowerCase()).join(" ");
  const types = (port.Types || []).map((t) => String(t).toLowerCase()).join(" ");
  const portName = String(port.PortName || "").toLowerCase();
  if (tags.includes("turret") || types.includes("turret") || portName.includes("turret")) return "turret";
  if (tags.includes("gimbal") || portName.includes("gimbal")) return "gimbal";
  return "fixed";
}

// Humanize a port name — "hardpoint_left_wing" → "Left wing".
function humanizeName(portName) {
  return String(portName || "")
    .replace(/^hardpoint[_\s]?/i, "")
    .replace(/[_\-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || "Hardpoint";
}

// Walk the ports tree depth-first. Returns a flat array of port objects.
function collectPortsRecursive(node, out = [], depth = 0) {
  if (depth > 10 || node == null) return out;
  if (Array.isArray(node)) {
    for (const v of node) collectPortsRecursive(v, out, depth + 1);
    return out;
  }
  if (typeof node !== "object") return out;
  // A port has Types + Size — pretty reliable signal.
  if (Array.isArray(node.Types) && (typeof node.Size === "number" || typeof node.MaxSize === "number")) {
    out.push(node);
  }
  for (const v of Object.values(node)) {
    if (v && (typeof v === "object" || Array.isArray(v))) {
      collectPortsRecursive(v, out, depth + 1);
    }
  }
  return out;
}

// Parse a single ship's JSON into our loadout structure.
function parseShipLoadout(shipJson) {
  const hardpoints = [];
  const components = [];
  const ports = collectPortsRecursive(shipJson);
  // De-dupe by PortName so nested copies don't double-count.
  const seen = new Set();
  for (const port of ports) {
    const portName = String(port.PortName || "");
    if (!portName || seen.has(portName)) continue;
    seen.add(portName);
    const types = port.Types || [];
    const size = Number(port.Size ?? port.MaxSize ?? port.MinSize ?? 0);
    if (size < 1 || size > 10) continue;
    if (typesIncludeWeapon(types)) {
      hardpoints.push({
        id: portName,
        label: humanizeName(portName),
        size,
        mount: detectMount(port),
      });
    } else {
      const cat = typesIncludeComponent(types);
      if (cat) {
        components.push({
          id: portName,
          label: humanizeName(portName),
          category: cat,
          size,
        });
      }
    }
  }
  return { hardpoints, components };
}

// Match a scunpacked ship class_name against our ships table. We pull
// every ship's class_name (projected from source_data) up-front so the
// matching is one round-trip.
async function loadShipsIndex() {
  console.log("Loading ships index from DB…");
  const PAGE = 500;
  const out = []; // { id, name, class_name }
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("ships")
      .select("id, name, class_name:source_data->>class_name")
      .order("name")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) {
      out.push({ id: r.id, name: r.name, class_name: r.class_name });
    }
    if ((data ?? []).length < PAGE) break;
  }
  console.log(`  ${out.length} ships`);
  return out;
}

function findMatchingShip(index, scunpackedClassName, scunpackedFileName) {
  const cname = (scunpackedClassName || "").toLowerCase();
  const fname = (scunpackedFileName || "").replace(/\.json$/i, "").toLowerCase();
  // Exact class_name match first.
  for (const s of index) {
    if (s.class_name && s.class_name.toLowerCase() === cname) return s;
  }
  // File-name match (without extension) against class_name.
  for (const s of index) {
    if (s.class_name && s.class_name.toLowerCase() === fname) return s;
  }
  // Fallback: normalized-name fuzzy match (drop _, lowercase).
  const norm = (s) => String(s).toLowerCase().replace(/[_\-\s]+/g, "");
  const targetNorm = norm(scunpackedClassName) || norm(fname);
  for (const s of index) {
    if (s.class_name && norm(s.class_name) === targetNorm) return s;
    if (norm(s.name) === targetNorm) return s;
  }
  return null;
}

async function main() {
  // 1. Get the file list from GitHub.
  console.log(`Fetching ship file list from GitHub: ${GH_API}`);
  const dirRes = await fetch(GH_API, {
    headers: { "user-agent": "citizendex-ingest" },
  });
  if (!dirRes.ok) {
    console.error(`GitHub API error: HTTP ${dirRes.status}`);
    console.error("If you're hitting rate limits, try GITHUB_TOKEN env var");
    process.exit(1);
  }
  const dir = await dirRes.json();
  if (!Array.isArray(dir)) {
    console.error("Unexpected GitHub response shape:", dir);
    process.exit(1);
  }
  const files = dir.filter((f) => f.type === "file" && f.name.endsWith(".json"));
  console.log(`Found ${files.length} ship JSON files`);

  // 2. Load our ships index for matching.
  const shipsIndex = await loadShipsIndex();

  // 3. Process in batches to keep memory + network sane.
  let matched = 0;
  let unmatched = 0;
  let errors = 0;
  let upserted = 0;
  const BATCH = 10;
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (f) => {
        try {
          const r = await fetch(`${RAW_BASE}/${f.name}`);
          if (!r.ok) return { file: f.name, error: `HTTP ${r.status}` };
          const json = await r.json();
          const className = json.ClassName || json.className || null;
          const ship = findMatchingShip(shipsIndex, className, f.name);
          if (!ship) return { file: f.name, className, ship: null };
          const loadout = parseShipLoadout(json);
          // Skip if we got nothing useful out of it (NPC ships often
          // have all-internal ports).
          if (loadout.hardpoints.length === 0 && loadout.components.length === 0) {
            return { file: f.name, className, ship, loadout, skipped: true };
          }
          return { file: f.name, className, ship, loadout };
        } catch (e) {
          return { file: f.name, error: e.message ?? String(e) };
        }
      }),
    );

    // 4. Upsert the loadouts into ships.ship_loadout in this batch.
    for (const r of results) {
      if (r.error) {
        console.warn(`  ! ${r.file}: ${r.error}`);
        errors += 1;
        continue;
      }
      if (!r.ship) {
        unmatched += 1;
        continue;
      }
      matched += 1;
      if (r.skipped) continue;
      const { error } = await client
        .from("ships")
        .update({ ship_loadout: r.loadout })
        .eq("id", r.ship.id);
      if (error) {
        console.warn(`  ! ${r.ship.name}: ${error.message}`);
        errors += 1;
      } else {
        upserted += 1;
      }
    }

    process.stdout.write(`\r  processed ${Math.min(i + BATCH, files.length)}/${files.length}…`);
  }
  process.stdout.write("\n");

  console.log(`\nDone:`);
  console.log(`  matched: ${matched}`);
  console.log(`  upserted: ${upserted}`);
  console.log(`  unmatched (no ship in our DB): ${unmatched}`);
  console.log(`  errors: ${errors}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
