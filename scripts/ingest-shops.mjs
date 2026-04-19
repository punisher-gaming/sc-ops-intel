#!/usr/bin/env node
// Ingest shops + shop_inventory from scunpacked.com/api/shops.json.
//
// scunpacked (richardthombs' original project, upstream of the data repo
// we use for ships/items) extracts shop definitions from Star Citizen game
// files and publishes the processed JSON at a stable public endpoint. We
// ingest from there so the user doesn't need a game install.
//
// Usage:
//   node scripts/ingest-shops.mjs
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.");
  process.exit(1);
}

const SOURCE = "https://scunpacked.com/api/shops.json";
async function detectPatch() {
  try {
    const res = await fetch("https://sc-ops-intel-ingest.clint-150.workers.dev/patch");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.using || body.detected || env.CURRENT_GAME_VERSION || "4.7.1";
  } catch (e) {
    console.warn(`[ingest-shops] patch auto-detect failed (${e.message}); using fallback`);
    return env.CURRENT_GAME_VERSION || "4.7.1";
  }
}
const GAME_VERSION = await detectPatch();
console.log(`[ingest-shops] patch ${GAME_VERSION}`);

async function main() {
  console.log(`[ingest-shops] fetching ${SOURCE}`);
  const t0 = Date.now();
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`shops.json: HTTP ${res.status}`);
  const shops = await res.json();
  console.log(
    `[ingest-shops] parsed ${shops.length} shops in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );

  const client = createClient(SUPABASE_URL, SUPABASE_SECRET, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Build shop rows + inventory rows
  const shopRows = [];
  const invRows = [];
  for (const s of shops) {
    if (!s.reference) continue;
    shopRows.push({
      id: s.reference,
      name: s.name ?? "(unnamed)",
      container_path: s.containerPath ?? null,
      accepts_stolen_goods: Boolean(s.acceptsStolenGoods),
      profit_margin: typeof s.profitMargin === "number" ? s.profitMargin : null,
      game_version: GAME_VERSION,
      source_data: s,
      last_synced_at: new Date().toISOString(),
    });
    for (const i of s.inventory ?? []) {
      if (!i.item_reference) continue;
      invRows.push({
        shop_id: s.reference,
        item_reference: i.item_reference,
        item_class_name: i.name ?? null,
        display_name: i.displayName ?? null,
        item_type: i.type ?? null,
        item_subtype: i.subType ?? null,
        base_price: typeof i.basePrice === "number" ? i.basePrice : null,
        max_discount_percentage:
          typeof i.maxDiscountPercentage === "number" ? i.maxDiscountPercentage : null,
        max_premium_percentage:
          typeof i.maxPremiumPercentage === "number" ? i.maxPremiumPercentage : null,
        inventory_current: typeof i.inventory === "number" ? i.inventory : null,
        optimal_inventory:
          typeof i.optimalInventoryLevel === "number" ? i.optimalInventoryLevel : null,
        max_inventory: typeof i.maxInventory === "number" ? i.maxInventory : null,
        shop_buys_this: Boolean(i.shopBuysThis),
        shop_sells_this: Boolean(i.shopSellsThis),
        shop_rents_this: Boolean(i.shopRentThis),
        tags: Array.isArray(i.tags) ? i.tags : null,
        game_version: GAME_VERSION,
        last_synced_at: new Date().toISOString(),
      });
    }
  }

  console.log(
    `[ingest-shops] ${shopRows.length} shops, ${invRows.length} inventory rows`,
  );

  // Upsert shops
  console.log(`[ingest-shops] upserting shops…`);
  let inserted = 0;
  for (let i = 0; i < shopRows.length; i += 200) {
    const batch = shopRows.slice(i, i + 200);
    const { error } = await client.from("shops").upsert(batch, { onConflict: "id" });
    if (error) throw error;
    inserted += batch.length;
    process.stdout.write(`\r[ingest-shops] shops ${inserted}/${shopRows.length}`);
  }
  process.stdout.write("\n");

  // Shop inventory has no natural PK — wipe + insert per game_version
  console.log(`[ingest-shops] clearing existing inventory for ${GAME_VERSION}`);
  const { error: delErr } = await client
    .from("shop_inventory")
    .delete()
    .eq("game_version", GAME_VERSION);
  if (delErr) throw delErr;

  console.log(`[ingest-shops] inserting inventory…`);
  inserted = 0;
  for (let i = 0; i < invRows.length; i += 500) {
    const batch = invRows.slice(i, i + 500);
    const { error } = await client.from("shop_inventory").insert(batch);
    if (error) throw error;
    inserted += batch.length;
    process.stdout.write(`\r[ingest-shops] inventory ${inserted}/${invRows.length}`);
  }
  process.stdout.write("\n");

  await client.from("ingest_runs").insert({
    source: "scunpacked_shops",
    status: "ok",
    rows_upserted: shopRows.length + invRows.length,
    duration_ms: Date.now() - t0,
    game_version: GAME_VERSION,
    message: `shops=${shopRows.length} inventory=${invRows.length}`,
    finished_at: new Date().toISOString(),
  });

  console.log(
    `[ingest-shops] done in ${((Date.now() - t0) / 1000).toFixed(1)}s. Patch ${GAME_VERSION}.`,
  );
}

main().catch((e) => {
  console.error("[ingest-shops] FAILED:", e);
  process.exit(1);
});
