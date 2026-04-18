import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../supabase";
import { fetchScunpackedJson } from "../scunpacked";
import { nowIso, recordRun, upsertInBatches } from "./util";

interface ScunpackedManufacturer {
  Reference?: string;
  UUID?: string;
  Code?: string;
  Name?: string;
  Country?: string;
  LogoURL?: string;
  Description?: string;
  [k: string]: unknown;
}

export async function ingestManufacturers(client: SupabaseClient, env: Env) {
  const started = Date.now();
  try {
    const data = await fetchScunpackedJson<ScunpackedManufacturer[]>(
      "manufacturers.json",
    );
    if (!Array.isArray(data) || data.length === 0) {
      const r = { ok: false, message: "empty payload" };
      await recordRun(client, "scunpacked_manufacturers", r, started);
      return r;
    }

    const rows = data
      .filter((m) => (m.Reference || m.UUID) && m.Name)
      .map((m) => ({
        id: String(m.Reference ?? m.UUID),
        code: m.Code ?? null,
        name: String(m.Name),
        country: m.Country ?? null,
        logo_url: m.LogoURL ?? null,
        description: m.Description ?? null,
        game_version: env.CURRENT_GAME_VERSION,
        source_data: m as unknown as Record<string, unknown>,
        last_synced_at: nowIso(),
      }));

    const res = await upsertInBatches(client, "manufacturers", rows, {
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
      "scunpacked_manufacturers",
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
      "scunpacked_manufacturers",
      { ok: false, message },
      started,
    );
    return { ok: false, message };
  }
}
