#!/usr/bin/env node
// One-off ingest: weapons + components from scunpacked items.json.
//
// items.json is ~107 MB, Git-LFS-backed. We fetch from the LFS media URL
// (which serves actual bytes, not pointer files) and partition by Type
// into the weapons or components table.
//
// Skips Misc / Cargo / Char_* / Display / Door / Seat / Paints / etc.
// Those are flavour items that don't deserve a top-level catalog page.
//
// Usage:
//   node scripts/ingest-items.mjs
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
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.\n" +
      "Put them in .env.local. SUPABASE_SECRET_KEY must be the service_role key.",
  );
  process.exit(1);
}

const SOURCE =
  "https://media.githubusercontent.com/media/StarCitizenWiki/scunpacked-data/master/items.json";

// Auto-detect from the worker's /patch endpoint (which reads the latest
// scunpacked-data commit). Falls back to env / hardcode if the worker is
// unreachable so we can still run offline.
async function detectPatch() {
  try {
    const res = await fetch("https://sc-ops-intel-ingest.clint-150.workers.dev/patch");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.using || body.detected || env.CURRENT_GAME_VERSION || "4.7.1";
  } catch (e) {
    console.warn(`[ingest-items] patch auto-detect failed (${e.message}); using fallback`);
    return env.CURRENT_GAME_VERSION || "4.7.1";
  }
}
const GAME_VERSION = await detectPatch();
console.log(`[ingest-items] patch ${GAME_VERSION}`);

// Type → table router.
// Anything matching WEAPON_TYPES → weapons table.
// Anything matching COMPONENT_TYPES → components table.
// Everything else → skipped.
const WEAPON_TYPES = new Set([
  "WeaponPersonal",
  "WeaponGun",
  "WeaponShip",
  "WeaponDefensive",
  "WeaponAttachment",
  "WeaponMounted",
  "Turret",
]);

const COMPONENT_TYPES = new Set([
  "Cooler",
  "PowerPlant",
  "Shield",
  "ShieldGenerator",
  "QuantumDrive",
  "FuelTank",
  "FuelIntake",
  "QuantumFuelTank",
  "MainThruster",
  "ManneuverThruster",
  "Radar",
  "Computer",
  "FlightController",
  "Scanner",
  "Ping",
  "WeaponRegenPool",
  "MissileLauncher",
  "Missile",
  "EMP",
  "QuantumInterdictionGenerator",
  "TractorBeam",
  "MiningArm",
  "MiningModifier",
  "SalvageModifier",
  "PaintingTool",
]);

function classify(type) {
  if (!type) return null;
  if (WEAPON_TYPES.has(type)) return "weapons";
  if (COMPONENT_TYPES.has(type)) return "components";
  // Catch-all heuristic: any "Weapon*" type goes into weapons
  if (type.startsWith("Weapon")) return "weapons";
  return null;
}

function buildRow(item) {
  return {
    id: item.reference,
    class_name: item.className ?? "",
    name: item.name && !String(item.name).includes("PLACEHOLDER") ? item.name : item.className,
    manufacturer: item.manufacturer ?? null,
    type: item.type,
    subtype: item.subType ?? null,
    classification: item.classification ?? null,
    grade: typeof item.grade === "number" ? item.grade : null,
    size: typeof item.size === "number" ? item.size : null,
    tags: item.tags ?? null,
    game_version: GAME_VERSION,
    source_data: item,
    last_synced_at: new Date().toISOString(),
  };
}

async function main() {
  console.log(`[ingest-items] fetching ${SOURCE}`);
  console.log(`[ingest-items] this is ~107 MB, may take a minute…`);
  const t0 = Date.now();
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`source fetch: HTTP ${res.status}`);
  const data = await res.json();
  console.log(
    `[ingest-items] parsed ${data.length} items in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );

  const client = createClient(SUPABASE_URL, SUPABASE_SECRET, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const weapons = [];
  const components = [];
  let skipped = 0;
  for (const item of data) {
    if (!item.reference) {
      skipped++;
      continue;
    }
    const dest = classify(item.type);
    if (!dest) {
      skipped++;
      continue;
    }
    const row = buildRow(item);
    if (dest === "weapons") weapons.push(row);
    else components.push(row);
  }

  console.log(
    `[ingest-items] partitioned: ${weapons.length} weapons, ${components.length} components, ${skipped} skipped`,
  );

  // Upsert in batches of 200 (rows are big — source_data jsonb is hefty)
  const SIZE = 200;

  console.log(`[ingest-items] upserting weapons…`);
  let inserted = 0;
  for (let i = 0; i < weapons.length; i += SIZE) {
    const batch = weapons.slice(i, i + SIZE);
    const { error } = await client
      .from("weapons")
      .upsert(batch, { onConflict: "id" });
    if (error) throw error;
    inserted += batch.length;
    process.stdout.write(`\r[ingest-items] weapons ${inserted}/${weapons.length}`);
  }
  process.stdout.write("\n");

  console.log(`[ingest-items] upserting components…`);
  inserted = 0;
  for (let i = 0; i < components.length; i += SIZE) {
    const batch = components.slice(i, i + SIZE);
    const { error } = await client
      .from("components")
      .upsert(batch, { onConflict: "id" });
    if (error) throw error;
    inserted += batch.length;
    process.stdout.write(
      `\r[ingest-items] components ${inserted}/${components.length}`,
    );
  }
  process.stdout.write("\n");

  await client.from("ingest_runs").insert({
    source: "scunpacked_items",
    status: "ok",
    rows_upserted: weapons.length + components.length,
    duration_ms: Date.now() - t0,
    game_version: GAME_VERSION,
    message: `weapons=${weapons.length} components=${components.length} skipped=${skipped}`,
    finished_at: new Date().toISOString(),
  });

  console.log(
    `[ingest-items] done in ${((Date.now() - t0) / 1000).toFixed(1)}s. Patch ${GAME_VERSION}.`,
  );
}

main().catch((e) => {
  console.error("[ingest-items] FAILED:", e);
  process.exit(1);
});
