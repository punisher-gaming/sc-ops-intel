import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../supabase";
import { fetchScunpackedJson } from "../scunpacked";
import { nowIso, recordRun, upsertInBatches } from "./util";

interface ScunpackedBlueprint {
  UUID?: string;
  Key?: string;
  Kind?: string;
  CategoryUUID?: string;
  Name?: string;
  Output?: {
    UUID?: string;
    Class?: string;
    Type?: string;
    Subtype?: string;
    Grade?: string;
    Name?: string;
  };
  Availability?: {
    Default?: boolean;
    RewardPools?: Array<{ UUID?: string; Key?: string; Name?: string }>;
    Shops?: Array<{ UUID?: string; Key?: string; Name?: string }>;
  };
  Tiers?: Array<{
    TierIndex?: number;
    CraftTimeSeconds?: number;
    Requirements?: RequirementsNode;
  }>;
  [k: string]: unknown;
}

interface RequirementsNode {
  Kind?: string;
  Key?: string;
  Name?: string;
  RequiredCount?: number;
  Modifiers?: unknown[];
  Children?: RequirementsNode[];
}

function summarizeRequirements(req: RequirementsNode | undefined) {
  if (!req || !req.Children) return [];
  const groups: Array<{
    key: string | null;
    name: string | null;
    required_count: number | null;
    modifier_count: number;
  }> = [];
  for (const child of req.Children) {
    if (child.Kind === "group") {
      groups.push({
        key: child.Key ?? null,
        name: child.Name ?? null,
        required_count: child.RequiredCount ?? null,
        modifier_count: Array.isArray(child.Modifiers) ? child.Modifiers.length : 0,
      });
    }
  }
  return groups;
}

export async function ingestBlueprints(client: SupabaseClient, env: Env) {
  const started = Date.now();
  try {
    const data = await fetchScunpackedJson<ScunpackedBlueprint[]>("blueprints.json");
    if (!Array.isArray(data) || data.length === 0) {
      const r = { ok: false, message: "empty blueprints.json" };
      await recordRun(client, "scunpacked_blueprints", r, started);
      return r;
    }

    const rows = data
      .filter((b) => b.UUID && b.Key)
      .map((b) => {
        const tier0 = b.Tiers?.[0];
        const outputName =
          b.Output?.Name ?? b.Output?.Class ?? b.Key ?? "unknown";
        return {
          id: String(b.UUID),
          key: String(b.Key),
          kind: b.Kind ?? null,
          category_uuid: b.CategoryUUID ?? null,
          name: String(outputName),
          output_item_uuid: b.Output?.UUID ?? null,
          output_item_class: b.Output?.Class ?? null,
          output_item_name: b.Output?.Name ?? null,
          output_item_type: b.Output?.Type ?? null,
          output_item_subtype: b.Output?.Subtype ?? null,
          output_grade: b.Output?.Grade ?? null,
          craft_time_seconds:
            typeof tier0?.CraftTimeSeconds === "number"
              ? Math.round(tier0.CraftTimeSeconds)
              : null,
          available_by_default: Boolean(b.Availability?.Default),
          required_groups: summarizeRequirements(tier0?.Requirements),
          game_version: env.CURRENT_GAME_VERSION,
          source_data: b as unknown as Record<string, unknown>,
          last_synced_at: nowIso(),
        };
      });

    const res = await upsertInBatches(client, "blueprints", rows, {
      onConflict: "id",
      batchSize: 300,
    });
    if (res.error) {
      const payload = { ok: false, inserted: res.inserted, message: res.error };
      await recordRun(
        client,
        "scunpacked_blueprints",
        { ok: false, rows: res.inserted, message: res.error, gameVersion: env.CURRENT_GAME_VERSION },
        started,
      );
      return payload;
    }

    // Derive blueprint_sources rows from Availability.RewardPools / Shops.
    const sources: Record<string, unknown>[] = [];
    for (const b of data) {
      if (!b.UUID) continue;
      for (const pool of b.Availability?.RewardPools ?? []) {
        sources.push({
          blueprint_id: b.UUID,
          source_kind: "reward_pool",
          source_uuid: pool.UUID ?? null,
          source_key: pool.Key ?? null,
          source_name: pool.Name ?? null,
          source_data: pool as unknown as Record<string, unknown>,
          game_version: env.CURRENT_GAME_VERSION,
          last_synced_at: nowIso(),
        });
      }
      for (const shop of b.Availability?.Shops ?? []) {
        sources.push({
          blueprint_id: b.UUID,
          source_kind: "shop",
          source_uuid: shop.UUID ?? null,
          source_key: shop.Key ?? null,
          source_name: shop.Name ?? null,
          source_data: shop as unknown as Record<string, unknown>,
          game_version: env.CURRENT_GAME_VERSION,
          last_synced_at: nowIso(),
        });
      }
    }

    // Wipe + reinsert — this table has no natural key.
    const { error: delErr } = await client
      .from("blueprint_sources")
      .delete()
      .eq("game_version", env.CURRENT_GAME_VERSION);
    if (delErr) throw delErr;

    let sourceRows = 0;
    const size = 500;
    for (let i = 0; i < sources.length; i += size) {
      const batch = sources.slice(i, i + size);
      const { error } = await client.from("blueprint_sources").insert(batch);
      if (error) throw error;
      sourceRows += batch.length;
    }

    const payload = {
      ok: true,
      blueprints: res.inserted,
      blueprint_sources: sourceRows,
      total: rows.length,
    };
    await recordRun(
      client,
      "scunpacked_blueprints",
      { ok: true, rows: res.inserted, gameVersion: env.CURRENT_GAME_VERSION },
      started,
    );
    return payload;
  } catch (e) {
    const message = (e as Error).message ?? String(e);
    await recordRun(
      client,
      "scunpacked_blueprints",
      { ok: false, message },
      started,
    );
    return { ok: false, message };
  }
}
