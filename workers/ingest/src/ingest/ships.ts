import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllPages } from "../sc-wiki";
import type { Env } from "../supabase";

// Minimal subset of fields we care about. The SC Wiki API returns many more;
// we stash the full payload in source_data so we can introspect and expand later.
interface WikiVehicle {
  id?: number | string;
  uuid?: string;
  slug?: string;
  name?: string;
  manufacturer?: { name?: string; code?: string } | string;
  class_name?: string;
  production_status?: string;
  size?: string;
  vehicle_size?: string;
  type?: string;
  role?: string;
  focus?: string;
  hull?: { hp?: number } | number;
  shield?: { hp?: number } | number;
  scm_speed?: number;
  max_speed?: number;
  cargo_capacity?: number;
  crew?: { min?: number; max?: number } | number;
  min_crew?: number;
  max_crew?: number;
  [k: string]: unknown;
}

function pickId(v: WikiVehicle, fallback: number): string {
  return String(v.uuid ?? v.slug ?? v.id ?? v.class_name ?? `wiki_${fallback}`);
}

function pickManufacturer(v: WikiVehicle): string | null {
  if (!v.manufacturer) return null;
  if (typeof v.manufacturer === "string") return v.manufacturer;
  return v.manufacturer.name ?? v.manufacturer.code ?? null;
}

function num(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return Math.round(x);
  return null;
}

export async function ingestShips(client: SupabaseClient, env: Env) {
  const vehicles = await fetchAllPages<WikiVehicle>(env.SC_WIKI_BASE, "/vehicles", 100, 50);

  if (vehicles.length === 0) {
    return { ok: false, inserted: 0, reason: "SC Wiki API returned no vehicles" };
  }

  const rows = vehicles.map((v, i) => {
    const hullHp = typeof v.hull === "object" ? num(v.hull?.hp) : num(v.hull);
    const shieldHp = typeof v.shield === "object" ? num(v.shield?.hp) : num(v.shield);
    const crewMin =
      typeof v.crew === "object" ? num(v.crew?.min) : num(v.min_crew);
    const crewMax =
      typeof v.crew === "object" ? num(v.crew?.max) : num(v.max_crew);

    return {
      id: pickId(v, i),
      game_version: env.CURRENT_GAME_VERSION,
      name: String(v.name ?? v.class_name ?? "unknown"),
      manufacturer: pickManufacturer(v),
      role: (v.role ?? v.focus ?? v.type ?? null) as string | null,
      size_class: (v.size ?? v.vehicle_size ?? null) as string | null,
      hull_hp: hullHp,
      shields_hp: shieldHp,
      scm_speed: num(v.scm_speed),
      max_speed: num(v.max_speed),
      cargo_scu: num(v.cargo_capacity),
      crew_min: crewMin,
      crew_max: crewMax,
      last_synced_at: new Date().toISOString(),
      source_data: v as unknown as Record<string, unknown>,
    };
  });

  // Upsert in batches of 100 to stay under the Supabase request limit
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await client.from("ships").upsert(batch, { onConflict: "id" });
    if (error) {
      return { ok: false, inserted, reason: `batch ${i}: ${error.message}` };
    }
    inserted += batch.length;
  }

  return { ok: true, inserted, total: vehicles.length };
}
