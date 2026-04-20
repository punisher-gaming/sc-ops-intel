import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../supabase";
import { fetchScunpackedJson } from "../scunpacked";
import { nowIso, recordRun, upsertInBatches } from "./util";

interface ScunpackedResource {
  UUID?: string;
  Key?: string;
  Name?: string;
  Kind?: string;
  Description?: string;
  BaseValue?: number;
  Rarity?: string;
  [k: string]: unknown;
}

interface LocationProviderEntry {
  Provider?: { UUID?: string; Name?: string };
  Locations?: Array<{
    System?: string;
    Name?: string;
    Type?: string;
  }>;
  Groups?: Array<{
    GroupName?: string;
    GroupProbability?: number;
    Deposits?: Array<{
      ResourceUUID?: string;
      RelativeProbability?: number;
      Clustering?: { Key?: string };
    }>;
  }>;
}

function pickLocationSummary(entry: LocationProviderEntry) {
  const loc = entry.Locations?.[0];
  return {
    system: loc?.System ?? null,
    location_name: loc?.Name ?? null,
    location_type: loc?.Type ?? null,
  };
}

export async function ingestResources(client: SupabaseClient, env: Env) {
  const started = Date.now();
  try {
    const data = await fetchScunpackedJson<ScunpackedResource[]>(
      "resources/resources.json",
    );
    if (!Array.isArray(data) || data.length === 0) {
      const r = { ok: false, message: "empty resources.json" };
      await recordRun(client, "scunpacked_resources", r, started);
      return r;
    }

    const rows = data
      .filter((r) => r.UUID && r.Key)
      .map((r) => ({
        id: String(r.UUID),
        key: String(r.Key),
        name: String(r.Name ?? r.Key),
        kind: r.Kind ?? null,
        description: r.Description ?? null,
        base_value: typeof r.BaseValue === "number" ? r.BaseValue : null,
        rarity: r.Rarity ?? null,
        game_version: env.CURRENT_GAME_VERSION,
        source_data: r as unknown as Record<string, unknown>,
        last_synced_at: nowIso(),
      }));

    const res = await upsertInBatches(client, "resources", rows, {
      onConflict: "id",
      batchSize: 500,
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
      "scunpacked_resources",
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
      "scunpacked_resources",
      { ok: false, message },
      started,
    );
    return { ok: false, message };
  }
}

export async function ingestResourceLocations(client: SupabaseClient, env: Env) {
  const started = Date.now();
  try {
    const data = await fetchScunpackedJson<LocationProviderEntry[]>(
      "resources/locations.json",
    );
    if (!Array.isArray(data)) {
      const r = { ok: false, message: "locations.json not an array" };
      await recordRun(client, "scunpacked_resource_locations", r, started);
      return r;
    }

    // Build set of resource ids already in DB so we can skip deposits for
    // resources we haven't ingested (FK would fail otherwise).
    const { data: known, error: knownErr } = await client
      .from("resources")
      .select("id");
    if (knownErr) throw knownErr;
    const knownIds = new Set((known ?? []).map((r: { id: string }) => r.id));

    const rows: Record<string, unknown>[] = [];
    for (const entry of data) {
      const loc = pickLocationSummary(entry);
      const providerUuid = entry.Provider?.UUID ?? null;
      const providerName = entry.Provider?.Name ?? null;
      for (const group of entry.Groups ?? []) {
        for (const deposit of group.Deposits ?? []) {
          if (!deposit.ResourceUUID) continue;
          if (!knownIds.has(deposit.ResourceUUID)) continue;
          rows.push({
            resource_id: deposit.ResourceUUID,
            provider_uuid: providerUuid,
            provider_name: providerName,
            system: loc.system,
            location_name: loc.location_name,
            location_type: loc.location_type,
            group_name: group.GroupName ?? null,
            group_probability:
              typeof group.GroupProbability === "number"
                ? group.GroupProbability
                : null,
            relative_probability:
              typeof deposit.RelativeProbability === "number"
                ? deposit.RelativeProbability
                : null,
            clustering_key: deposit.Clustering?.Key ?? null,
            game_version: env.CURRENT_GAME_VERSION,
            source_data: deposit as unknown as Record<string, unknown>,
            last_synced_at: nowIso(),
          });
        }
      }
    }

    // Blow away the old rows for this game_version, locations change by patch
    // and there's no stable id on the join row, so delete-then-insert is cleanest.
    const { error: delErr } = await client
      .from("resource_locations")
      .delete()
      .eq("game_version", env.CURRENT_GAME_VERSION);
    if (delErr) throw delErr;

    let inserted = 0;
    const size = 500;
    for (let i = 0; i < rows.length; i += size) {
      const batch = rows.slice(i, i + size);
      const { error } = await client.from("resource_locations").insert(batch);
      if (error) throw error;
      inserted += batch.length;
    }

    const payload = { ok: true, inserted, total: rows.length };
    await recordRun(
      client,
      "scunpacked_resource_locations",
      { ok: true, rows: inserted, gameVersion: env.CURRENT_GAME_VERSION },
      started,
    );
    return payload;
  } catch (e) {
    const message = (e as Error).message ?? String(e);
    await recordRun(
      client,
      "scunpacked_resource_locations",
      { ok: false, message },
      started,
    );
    return { ok: false, message };
  }
}
