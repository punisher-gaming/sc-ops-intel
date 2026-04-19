// Ingest commodity availability (who sells/buys what) from
// scunpacked-data/resources/commodity_trade_locations.json (~43 MB).
//
// Ported from scripts/ingest-availability.mjs. We use native JSON.parse here
// (not streaming) because V8's C++ parser is ~50x faster than a JS state
// machine — critical for staying under the Worker CPU budget. The 43 MB
// source parses to ~150 MB heap which is right at the 128 MB Worker limit,
// so this can OOM on bad days; if it does, the local script in
// scripts/ingest-availability.mjs remains the fallback.
//
// FK preflight: skip rows whose commodity_id or trade_location_id we don't
// know about yet. Counts are surfaced in the run record so drift is visible.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../supabase";
import { recordRun } from "./util";

const SOURCE =
  "https://raw.githubusercontent.com/StarCitizenWiki/scunpacked-data/master/resources/commodity_trade_locations.json";

interface CommodityRecord {
  CommodityUUID: string;
  SoldAt?: Array<{
    TradeLocationUUID?: string;
    StarmapObjectUUID?: string;
    MatchedTagName?: string;
  }>;
  BoughtAt?: Array<{
    TradeLocationUUID?: string;
    StarmapObjectUUID?: string;
    MatchedTagName?: string;
  }>;
}

export async function ingestCommodityAvailability(
  client: SupabaseClient,
  env: Env,
  gameVersion?: string,
) {
  const startedAt = Date.now();
  const version = gameVersion ?? env.CURRENT_GAME_VERSION;
  try {
    // FK preflight — load the universes of valid IDs we can reference.
    // Use explicit large range to fetch all rows in ONE request each (PostgREST
    // default cap is 1000 — we override to keep this to 2 subrequests total
    // since Workers Free is capped at 50 subrequests per invocation).
    const [{ data: comms, error: cErr }, { data: locs, error: lErr }] =
      await Promise.all([
        client.from("commodities").select("id").range(0, 99999),
        client.from("trade_locations").select("id").range(0, 99999),
      ]);
    if (cErr) throw cErr;
    if (lErr) throw lErr;
    const commIds = new Set((comms ?? []).map((c: { id: string }) => c.id));
    const locIds = new Set((locs ?? []).map((l: { id: string }) => l.id));

    // Wipe existing rows for this version (per-patch refresh)
    const { error: delErr } = await client
      .from("commodity_availability")
      .delete()
      .eq("game_version", version);
    if (delErr) throw delErr;

    const res = await fetch(SOURCE, {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) throw new Error(`source: HTTP ${res.status}`);
    const data = (await res.json()) as CommodityRecord[];

    let inserted = 0;
    let missingCommodity = 0;
    let missingLocation = 0;
    let pending: Record<string, unknown>[] = [];

    async function flush() {
      if (pending.length === 0) return;
      const { error } = await client.from("commodity_availability").insert(pending);
      if (error) throw error;
      inserted += pending.length;
      pending = [];
    }

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
        pending.push({
          commodity_id: c.CommodityUUID,
          trade_location_id: s.TradeLocationUUID,
          kind: "sold",
          starmap_object_uuid: s.StarmapObjectUUID ?? null,
          tag_name: s.MatchedTagName ?? null,
          game_version: version,
        });
        // 5000-row batches keep us well under the Workers Free 50-subrequest
        // cap even for ~100k availability rows (= 20 INSERT subrequests).
        if (pending.length >= 5000) await flush();
      }
      for (const b of c.BoughtAt ?? []) {
        if (!b.TradeLocationUUID) continue;
        if (!locIds.has(b.TradeLocationUUID)) {
          missingLocation += 1;
          continue;
        }
        pending.push({
          commodity_id: c.CommodityUUID,
          trade_location_id: b.TradeLocationUUID,
          kind: "bought",
          starmap_object_uuid: b.StarmapObjectUUID ?? null,
          tag_name: b.MatchedTagName ?? null,
          game_version: version,
        });
        // 5000-row batches keep us well under the Workers Free 50-subrequest
        // cap even for ~100k availability rows (= 20 INSERT subrequests).
        if (pending.length >= 5000) await flush();
      }
    }
    await flush();

    const result = {
      ok: true,
      inserted,
      skipped_commodities: missingCommodity,
      skipped_locations: missingLocation,
      gameVersion: version,
    };
    await recordRun(
      client,
      "scunpacked_commodity_availability",
      {
        ok: true,
        rows: inserted,
        gameVersion: version,
        message: `skipped_commodities=${missingCommodity} skipped_locations=${missingLocation}`,
      },
      startedAt,
    );
    return result;
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    await recordRun(
      client,
      "scunpacked_commodity_availability",
      { ok: false, message: msg, gameVersion: version },
      startedAt,
    );
    return { ok: false, error: msg, gameVersion: version };
  }
}
