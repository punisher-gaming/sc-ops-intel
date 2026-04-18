import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../supabase";
import { fetchScunpackedJson } from "../scunpacked";
import { nowIso, recordRun, upsertInBatches } from "./util";

interface ScunpackedTradeLocation {
  UUID?: string;
  ClassName?: string;
  DisplayName?: string;
  Disabled?: boolean;
  [k: string]: unknown;
}

// Extract system/planet/place from the class name when possible.
// Example: DC_Stan_Aban_S1_DupreeIndustrial_ManuFacility
//   DC      → commodity / distribution center category
//   Stan    → Stanton system
//   Aban    → planet code (ArcCorp Abandoned? we just stash the code)
//   rest    → place identifier
function parseClassName(className: string | null | undefined): {
  system: string | null;
  planet: string | null;
  place: string | null;
  kind: string | null;
} {
  if (!className) return { system: null, planet: null, place: null, kind: null };
  const parts = className.split("_");
  const kind = parts[0] ?? null;
  const systemCode = parts[1]?.toLowerCase();
  const systemMap: Record<string, string> = {
    stan: "Stanton",
    pyro: "Pyro",
    nyx: "Nyx",
    terra: "Terra",
  };
  return {
    system: systemCode ? (systemMap[systemCode] ?? parts[1] ?? null) : null,
    planet: parts[2] ?? null,
    place: parts.slice(3).join("_") || null,
    kind,
  };
}

export async function ingestTradeLocations(client: SupabaseClient, env: Env) {
  const started = Date.now();
  try {
    const data = await fetchScunpackedJson<ScunpackedTradeLocation[]>(
      "trade_locations.json",
    );
    if (!Array.isArray(data) || data.length === 0) {
      const r = { ok: false, message: "empty trade_locations.json" };
      await recordRun(client, "scunpacked_trade_locations", r, started);
      return r;
    }

    const rows = data
      .filter((t) => t.UUID)
      .map((t) => {
        const parsed = parseClassName(t.ClassName);
        return {
          id: String(t.UUID),
          name: String(t.DisplayName ?? t.ClassName ?? t.UUID),
          system: parsed.system,
          planet: parsed.planet,
          place: parsed.place,
          kind: parsed.kind,
          operator: null as string | null,
          game_version: env.CURRENT_GAME_VERSION,
          source_data: t as unknown as Record<string, unknown>,
          last_synced_at: nowIso(),
        };
      });

    const res = await upsertInBatches(client, "trade_locations", rows, {
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
      "scunpacked_trade_locations",
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
      "scunpacked_trade_locations",
      { ok: false, message },
      started,
    );
    return { ok: false, message };
  }
}
