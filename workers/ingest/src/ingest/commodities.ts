import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../supabase";
import { fetchScunpackedJson } from "../scunpacked";
import { nowIso, recordRun, upsertInBatches } from "./util";

interface ScunpackedCommodity {
  UUID?: string;
  Code?: string;
  Name?: string;
  Kind?: string;
  Description?: string;
  [k: string]: unknown;
}

export async function ingestCommodities(client: SupabaseClient, env: Env) {
  const started = Date.now();
  try {
    const data = await fetchScunpackedJson<ScunpackedCommodity[]>(
      "resources/commodities.json",
    );
    if (!Array.isArray(data) || data.length === 0) {
      const r = { ok: false, message: "empty commodities.json" };
      await recordRun(client, "scunpacked_commodities", r, started);
      return r;
    }

    const rows = data
      .filter((c) => c.UUID && c.Name)
      .map((c) => ({
        id: String(c.UUID),
        code: c.Code ?? null,
        name: String(c.Name),
        kind: c.Kind ?? null,
        description: c.Description ?? null,
        game_version: env.CURRENT_GAME_VERSION,
        source_data: c as unknown as Record<string, unknown>,
        last_synced_at: nowIso(),
      }));

    const res = await upsertInBatches(client, "commodities", rows, {
      onConflict: "id",
    });
    const ok = !res.error;
    const payload = {
      ok,
      inserted: res.inserted,
      total: rows.length,
      message: res.error ?? null,
    };
    await recordRun(
      client,
      "scunpacked_commodities",
      {
        ok,
        rows: res.inserted,
        message: res.error,
        gameVersion: env.CURRENT_GAME_VERSION,
      },
      started,
    );
    return payload;
  } catch (e) {
    const message = (e as Error).message ?? String(e);
    await recordRun(
      client,
      "scunpacked_commodities",
      { ok: false, message },
      started,
    );
    return { ok: false, message };
  }
}
