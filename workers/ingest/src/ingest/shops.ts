// Ingest shops + shop_inventory from scunpacked.com/api/shops.json.
// Ported from scripts/ingest-shops.mjs so the daily cron handles it.
//
// Source is a 12 MB JSON dump that fits comfortably in a Worker JSON.parse.
// shop_inventory has no natural PK so we wipe-and-replace per game_version.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../supabase";
import { upsertInBatches, recordRun, nowIso } from "./util";

const SOURCE = "https://scunpacked.com/api/shops.json";

interface ShopRecord {
  reference: string;
  name?: string;
  containerPath?: string;
  acceptsStolenGoods?: boolean;
  profitMargin?: number;
  inventory?: Array<{
    item_reference?: string;
    name?: string;
    displayName?: string;
    type?: string;
    subType?: string;
    basePrice?: number;
    maxDiscountPercentage?: number;
    maxPremiumPercentage?: number;
    inventory?: number;
    optimalInventoryLevel?: number;
    maxInventory?: number;
    shopBuysThis?: boolean;
    shopSellsThis?: boolean;
    shopRentThis?: boolean;
    tags?: string[];
  }>;
}

export async function ingestShops(client: SupabaseClient, env: Env, gameVersion?: string) {
  const startedAt = Date.now();
  const version = gameVersion ?? env.CURRENT_GAME_VERSION;
  try {
    const res = await fetch(SOURCE, {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) throw new Error(`shops.json: HTTP ${res.status}`);
    const shops = (await res.json()) as ShopRecord[];

    const shopRows: Record<string, unknown>[] = [];
    const invRows: Record<string, unknown>[] = [];
    for (const s of shops) {
      if (!s.reference) continue;
      shopRows.push({
        id: s.reference,
        name: s.name ?? "(unnamed)",
        container_path: s.containerPath ?? null,
        accepts_stolen_goods: Boolean(s.acceptsStolenGoods),
        profit_margin: typeof s.profitMargin === "number" ? s.profitMargin : null,
        game_version: version,
        source_data: s,
        last_synced_at: nowIso(),
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
          game_version: version,
          last_synced_at: nowIso(),
        });
      }
    }

    // Big batches to stay under the 50-subrequest Workers Free cap when
    // running inside the full nightly cron (which has 7 prior ingests
    // burning through the budget).
    const shopUp = await upsertInBatches(client, "shops", shopRows, {
      onConflict: "id",
      batchSize: 1000,
    });
    if (shopUp.error) throw new Error(shopUp.error);

    // Wipe + insert inventory for this version (no natural PK)
    const { error: delErr } = await client
      .from("shop_inventory")
      .delete()
      .eq("game_version", version);
    if (delErr) throw delErr;

    let invInserted = 0;
    for (let i = 0; i < invRows.length; i += 5000) {
      const batch = invRows.slice(i, i + 5000);
      const { error } = await client.from("shop_inventory").insert(batch);
      if (error) throw error;
      invInserted += batch.length;
    }

    const result = {
      ok: true,
      shops: shopRows.length,
      inventory: invInserted,
      gameVersion: version,
    };
    await recordRun(
      client,
      "scunpacked_shops",
      {
        ok: true,
        rows: shopRows.length + invInserted,
        gameVersion: version,
        message: `shops=${shopRows.length} inventory=${invInserted}`,
      },
      startedAt,
    );
    return result;
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    await recordRun(
      client,
      "scunpacked_shops",
      { ok: false, message: msg, gameVersion: version },
      startedAt,
    );
    return { ok: false, error: msg, gameVersion: version };
  }
}
