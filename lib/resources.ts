import { createClient } from "./supabase/client";

export interface Resource {
  id: string;
  key: string;
  name: string;
  kind: string | null;
  description: string | null;
  base_value: number | null;
  rarity: string | null;
  game_version: string | null;
  last_synced_at: string | null;
  source_data?: Record<string, unknown> | null;
}

export interface ResourceLocation {
  id: number;
  resource_id: string;
  provider_uuid: string | null;
  provider_name: string | null;
  system: string | null;
  location_name: string | null;
  location_type: string | null;
  group_name: string | null;
  group_probability: number | null;
  relative_probability: number | null;
  clustering_key: string | null;
  game_version: string | null;
}

const LIST_COLS =
  "id, key, name, kind, description, base_value, rarity, game_version, last_synced_at";

export async function fetchResources(): Promise<Resource[]> {
  const client = createClient();
  const PAGE = 1000;
  const out: Resource[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("resources")
      .select(LIST_COLS)
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Resource[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function fetchResource(id: string): Promise<Resource | null> {
  const client = createClient();
  const { data, error } = await client
    .from("resources")
    .select(LIST_COLS + ", source_data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Resource | null;
}

export async function fetchResourceLocations(resourceId: string): Promise<ResourceLocation[]> {
  const client = createClient();
  const { data, error } = await client
    .from("resource_locations")
    .select(
      "id, resource_id, provider_uuid, provider_name, system, location_name, location_type, group_name, group_probability, relative_probability, clustering_key, game_version",
    )
    .eq("resource_id", resourceId)
    .order("group_probability", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ResourceLocation[];
}

export function uniqueValues<T extends keyof Resource>(resources: Resource[], key: T): string[] {
  const set = new Set<string>();
  for (const r of resources) {
    const v = r[key];
    if (typeof v === "string" && v.trim()) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function prettyKind(kind: string | null): string {
  if (!kind) return "—";
  // cave_harvestable → "Cave harvestable"
  return kind
    .replace(/_/g, " ")
    .replace(/^([a-z])/, (m) => m.toUpperCase());
}

export function displayName(r: Resource): string {
  // Placeholder names in scunpacked look like "<= PLACEHOLDER =>". Fall back to a
  // cleaned-up key so the list stays usable until those names get filled in.
  if (r.name && !r.name.includes("PLACEHOLDER")) return r.name;
  return r.key
    .replace(/^Carryable_/, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

// In-game location codes are terse ("PYR3 L1" = Pyro III Lagrange Point 1).
// Players see these in the Starmap UI, but the friendly form reads better
// in our catalog. Maps the planet prefix to its English name + roman numeral
// and keeps suffixes (L1..L5, _A, _B, etc.) intact.
//
// PYR3 L1     → Pyro III · L1
// STAN2 L4    → Stanton II · L4   (Crusader L4)
// HUR2_L1     → Stanton I · L1    (Hurston is STAN1 — but legacy keys exist)
// pyro_iii_l1 → Pyro III · L1
const SYSTEM_PLANETS: Record<string, string[]> = {
  // Index 0 unused (planets are 1-indexed in-game)
  STAN: ["", "Hurston", "Crusader", "ArcCorp", "microTech"],
  PYR: ["", "Pyro I", "Monox", "Bloom", "Terminus", "Pyro V", "Pyro VI"],
  NYX: ["", "Nyx I", "Delamar"],
  TER: ["", "Pike", "Magda", "Terra", "Henge"],
  MAG: ["", "Borea"],
  ODI: ["", "Odin I"],
};

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function prettyLocationName(raw: string | null | undefined): string {
  if (!raw) return "Unknown";
  // Normalise: strip whitespace runs, uppercase, allow "_" as space
  const norm = raw.trim().replace(/_/g, " ").replace(/\s+/g, " ");
  // Match a leading planet code: 2-4 letters + 1-2 digits, optionally
  // followed by anything (L1, OM4, satellite name, etc.)
  const m = norm.match(/^([A-Z]{2,4})(\d{1,2})\b\s*(.*)$/i);
  if (!m) return raw; // Doesn't look like a code — return as-is
  const prefix = m[1].toUpperCase();
  const planetIdx = parseInt(m[2], 10);
  const rest = m[3]?.trim() ?? "";
  const sysPlanets = SYSTEM_PLANETS[prefix];
  let planetName: string;
  if (sysPlanets && sysPlanets[planetIdx]) {
    planetName = sysPlanets[planetIdx];
  } else if (sysPlanets) {
    // Known system, unknown planet idx — fall back to "<System> <Roman>"
    const sys = prefix === "STAN" ? "Stanton" : prefix === "PYR" ? "Pyro" : prefix;
    planetName = `${sys} ${ROMAN[planetIdx] ?? planetIdx}`;
  } else {
    return raw; // Unknown system code — don't guess
  }
  return rest ? `${planetName} · ${rest.toUpperCase()}` : planetName;
}

export function formatPct(n: number | null | undefined): string {
  if (n == null) return "—";
  // Probabilities come in as fractions (0–1)
  return `${(n * 100).toFixed(n < 0.01 ? 2 : 1)}%`;
}
