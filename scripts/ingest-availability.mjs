#!/usr/bin/env node
// One-off ingest: commodity availability (who sells/buys what).
//
// Why Node and not the Cloudflare Worker: the source file is 42 MB which
// blows past CF Worker memory when parsed in one shot. Running locally is
// fine — it's patch-cadence data, not daily.
//
// Usage:
//   node scripts/ingest-availability.mjs
//
// Requires env in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SECRET_KEY      (service role key — the sb_secret_... one)
//                            (bypasses RLS for bulk insert)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// Minimal dotenv — only parses the two vars we need out of .env.local.
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
      "Put them in .env.local or export in your shell.\n" +
      "SUPABASE_SECRET_KEY must be the service_role key (starts with sb_secret_).",
  );
  process.exit(1);
}

const SOURCE =
  "https://raw.githubusercontent.com/StarCitizenWiki/scunpacked-data/master/resources/commodity_trade_locations.json";

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
    console.warn(`[ingest-availability] patch auto-detect failed (${e.message}); using fallback`);
    return env.CURRENT_GAME_VERSION || "4.7.1";
  }
}
const GAME_VERSION = await detectPatch();
console.log(`[ingest-availability] patch ${GAME_VERSION}`);

async function main() {
  console.log(`[ingest-availability] fetching ${SOURCE}`);
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`source fetch: HTTP ${res.status}`);
  const data = await res.json();
  console.log(`[ingest-availability] parsed ${data.length} commodities`);

  const client = createClient(SUPABASE_URL, SUPABASE_SECRET, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Preflight — make sure the commodities + trade_locations we reference exist
  // in our DB. Anything not in those tables gets skipped (FK would fail
  // otherwise); we log the count so you can spot drift.
  const [{ data: comms, error: cErr }, { data: locs, error: lErr }] =
    await Promise.all([
      client.from("commodities").select("id"),
      client.from("trade_locations").select("id"),
    ]);
  if (cErr) throw cErr;
  if (lErr) throw lErr;
  const commIds = new Set(comms.map((c) => c.id));
  const locIds = new Set(locs.map((l) => l.id));
  console.log(
    `[ingest-availability] ${commIds.size} known commodities, ${locIds.size} known trade locations`,
  );

  const rows = [];
  let missingCommodity = 0;
  let missingLocation = 0;
  for (const c of data) {
    if (!c.CommodityUUID) continue;
    if (!commIds.has(c.CommodityUUID)) {
      missingCommodity += 1;
      continue;
    }
    for (const s of c.SoldAt ?? []) {
      if (!s.TradeLocationUUID) continue;
      if (!locIds.has(s.TradeLocationUUID)) {
        missingLocation += 1;
        continue;
      }
      rows.push({
        commodity_id: c.CommodityUUID,
        trade_location_id: s.TradeLocationUUID,
        kind: "sold",
        starmap_object_uuid: s.StarmapObjectUUID ?? null,
        tag_name: s.MatchedTagName ?? null,
        game_version: GAME_VERSION,
      });
    }
    for (const b of c.BoughtAt ?? []) {
      if (!b.TradeLocationUUID) continue;
      if (!locIds.has(b.TradeLocationUUID)) {
        missingLocation += 1;
        continue;
      }
      rows.push({
        commodity_id: c.CommodityUUID,
        trade_location_id: b.TradeLocationUUID,
        kind: "bought",
        starmap_object_uuid: b.StarmapObjectUUID ?? null,
        tag_name: b.MatchedTagName ?? null,
        game_version: GAME_VERSION,
      });
    }
  }

  console.log(
    `[ingest-availability] built ${rows.length} availability rows (skipped ${missingCommodity} unknown commodities, ${missingLocation} unknown locations)`,
  );

  // Clean slate for this game_version — availability can shift per patch.
  console.log(`[ingest-availability] clearing existing rows for ${GAME_VERSION}`);
  const { error: delErr } = await client
    .from("commodity_availability")
    .delete()
    .eq("game_version", GAME_VERSION);
  if (delErr) throw delErr;

  // Bulk insert in batches
  const SIZE = 1000;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += SIZE) {
    const batch = rows.slice(i, i + SIZE);
    const { error } = await client.from("commodity_availability").insert(batch);
    if (error) throw error;
    inserted += batch.length;
    process.stdout.write(`\r[ingest-availability] inserted ${inserted}/${rows.length}`);
  }
  process.stdout.write("\n");

  // Audit log
  await client.from("ingest_runs").insert({
    source: "scunpacked_commodity_availability",
    status: "ok",
    rows_upserted: inserted,
    duration_ms: null,
    game_version: GAME_VERSION,
    message: `skipped_commodities=${missingCommodity} skipped_locations=${missingLocation}`,
    finished_at: new Date().toISOString(),
  });

  console.log(
    `[ingest-availability] done. ${inserted} rows inserted for patch ${GAME_VERSION}.`,
  );
}

main().catch((e) => {
  console.error("[ingest-availability] FAILED:", e);
  process.exit(1);
});
