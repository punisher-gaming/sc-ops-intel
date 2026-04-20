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

// scunpacked ship Loadout entries. Each entry has:
//   HardpointName: "hardpoint_weapon_class2_nose"
//   Type: "Turret.GunTurret" / "PowerPlant.Power" / "Shield.UNDEFINED"
//   ItemTypes: [{Type:"Turret"}, {Type:"WeaponGun"}, ...]
//   MaxSize / MinSize: 1-9
//   Editable: bool (is the slot user-customizable in-game)
//
// We classify by the head of the Type string (or any ItemTypes[].Type)
// and bucket into our weapon vs component categories.

const WEAPON_TYPE_HEADS = new Set([
  "weapongun",
  "turret",
  "missilelauncher",
  "weaponmounted",
]);
const COMPONENT_TYPE_MAP = {
  shield: "shield",
  shieldgenerator: "shield",
  powerplant: "powerplant",
  cooler: "cooler",
  quantumdrive: "quantum",
};

function gatherTypeHeads(loadoutEntry) {
  const heads = new Set();
  if (typeof loadoutEntry.Type === "string") {
    heads.add(loadoutEntry.Type.toLowerCase().split(".")[0]);
  }
  if (Array.isArray(loadoutEntry.ItemTypes)) {
    for (const t of loadoutEntry.ItemTypes) {
      if (t && typeof t.Type === "string") {
        heads.add(t.Type.toLowerCase().split(".")[0]);
      }
    }
  }
  return heads;
}

function classifyLoadoutEntry(loadoutEntry) {
  const heads = gatherTypeHeads(loadoutEntry);
  for (const h of heads) {
    if (WEAPON_TYPE_HEADS.has(h)) return { kind: "weapon" };
  }
  for (const h of heads) {
    if (COMPONENT_TYPE_MAP[h]) return { kind: "component", category: COMPONENT_TYPE_MAP[h] };
  }
  return null;
}

// Mount classification — fixed vs gimbal vs turret. Use the Type
// string (Turret.GunTurret = turret) and the hardpoint name
// (any "_turret" or "_ball" suggests turret).
function detectMount(loadoutEntry) {
  const t = (loadoutEntry.Type || "").toLowerCase();
  const name = (loadoutEntry.HardpointName || "").toLowerCase();
  if (t.startsWith("turret") || name.includes("turret") || name.includes("_ball")) return "turret";
  if (name.includes("gimbal")) return "gimbal";
  return "fixed";
}

// Humanize a hardpoint name — "hardpoint_weapon_class2_nose" → "Nose".
function humanizeName(name) {
  return String(name || "")
    .replace(/^hardpoint[_\s]?/i, "")
    .replace(/^weapon[_\s]?/i, "")
    .replace(/^class\d+[_\s]?/i, "")
    .replace(/[_\-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || "Hardpoint";
}

// Parse a single ship's JSON into our loadout structure. The top-level
// `Loadout` array is the canonical source.
function parseShipLoadout(shipJson) {
  const hardpoints = [];
  const components = [];
  const loadout = Array.isArray(shipJson.Loadout) ? shipJson.Loadout : [];
  const seen = new Set();
  for (const entry of loadout) {
    const name = String(entry.HardpointName || "");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const size = Number(entry.MaxSize ?? entry.MinSize ?? 0);
    if (size < 1 || size > 9) continue;
    const cls = classifyLoadoutEntry(entry);
    if (!cls) continue;
    if (cls.kind === "weapon") {
      hardpoints.push({
        id: name,
        label: humanizeName(name),
        size,
        mount: detectMount(entry),
      });
    } else {
      components.push({
        id: name,
        label: humanizeName(name),
        category: cls.category,
        size,
      });
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
