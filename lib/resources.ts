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

export function formatPct(n: number | null | undefined): string {
  if (n == null) return "—";
  // Probabilities come in as fractions (0–1)
  return `${(n * 100).toFixed(n < 0.01 ? 2 : 1)}%`;
}
