import { createClient } from "./supabase/client";

export interface Blueprint {
  id: string;
  key: string;
  kind: string | null;
  name: string;
  output_item_uuid: string | null;
  output_item_class: string | null;
  output_item_name: string | null;
  output_item_type: string | null;
  output_item_subtype: string | null;
  output_grade: string | null;
  craft_time_seconds: number | null;
  available_by_default: boolean | null;
  required_groups:
    | Array<{
        key: string | null;
        name: string | null;
        required_count: number | null;
        modifier_count: number;
      }>
    | null;
  game_version: string | null;
  last_synced_at: string | null;
  source_data?: Record<string, unknown> | null;
}

export interface BlueprintSource {
  id: number;
  blueprint_id: string;
  source_kind: string;
  source_uuid: string | null;
  source_key: string | null;
  source_name: string | null;
}

// Shape of source_data.Dismantle.Returns entries (from scunpacked).
export interface DismantleReturn {
  Kind: string;             // "resource" etc.
  UUID: string;
  Name: string;
  QuantityScu: number;
}

export function dismantleReturns(b: Blueprint): DismantleReturn[] {
  const dm = (b.source_data as { Dismantle?: { Returns?: DismantleReturn[] } } | null | undefined)?.Dismantle;
  if (!dm || !Array.isArray(dm.Returns)) return [];
  return dm.Returns.filter((r) => r && r.UUID && r.Name);
}

export function dismantleTimeSeconds(b: Blueprint): number | null {
  const dm = (b.source_data as { Dismantle?: { TimeSeconds?: number } } | null | undefined)?.Dismantle;
  return typeof dm?.TimeSeconds === "number" ? Math.round(dm.TimeSeconds) : null;
}

export function dismantleEfficiency(b: Blueprint): number | null {
  const dm = (b.source_data as { Dismantle?: { Efficiency?: number } } | null | undefined)?.Dismantle;
  return typeof dm?.Efficiency === "number" ? dm.Efficiency : null;
}

const LIST_COLS =
  "id, key, kind, name, output_item_class, output_item_name, output_item_type, output_item_subtype, output_grade, craft_time_seconds, available_by_default, required_groups, game_version, last_synced_at";

const DETAIL_COLS = LIST_COLS + ", output_item_uuid, source_data";

export async function fetchBlueprints(): Promise<Blueprint[]> {
  const client = createClient();
  // Supabase's default row cap is 1000; we page until the API returns fewer
  // than a full page so we get the full catalog (currently ~1,044 rows).
  const PAGE = 1000;
  const out: Blueprint[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("blueprints")
      .select(LIST_COLS)
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Blueprint[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function fetchBlueprint(id: string): Promise<Blueprint | null> {
  const client = createClient();
  const { data, error } = await client
    .from("blueprints")
    .select(DETAIL_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Blueprint | null;
}

export async function fetchBlueprintSources(
  blueprintId: string,
): Promise<BlueprintSource[]> {
  const client = createClient();
  const { data, error } = await client
    .from("blueprint_sources")
    .select("id, blueprint_id, source_kind, source_uuid, source_key, source_name")
    .eq("blueprint_id", blueprintId);
  if (error) throw error;
  return (data ?? []) as BlueprintSource[];
}

// Returns the set of blueprint_ids that have at least one canonical source
// (mission reward pool, shop, etc.). Used by the /blueprints list to power
// the "only show blueprints with known sources" toggle.
export async function fetchBlueprintIdsWithSources(): Promise<Set<string>> {
  const client = createClient();
  const PAGE = 1000;
  const out = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("blueprint_sources")
      .select("blueprint_id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ blueprint_id: string }>;
    for (const r of rows) out.add(r.blueprint_id);
    if (rows.length < PAGE) break;
  }
  return out;
}

// Fetch all (blueprint_id, mission_family) pairs. Mission family is derived
// from source_key — we strip "BP_MISSIONREWARD_" and keep everything up to
// the first trailing variant tag (e.g. "_AB", "_A", "_B"). Lets users filter
// blueprints by "only drops in XenoThreat missions", etc.
export async function fetchBlueprintMissionFamilies(): Promise<{
  byBlueprint: Map<string, Set<string>>;
  families: string[];
}> {
  const client = createClient();
  const PAGE = 1000;
  const byBlueprint = new Map<string, Set<string>>();
  const familyCounts = new Map<string, number>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("blueprint_sources")
      .select("blueprint_id, source_key, source_name")
      .eq("source_kind", "reward_pool")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      blueprint_id: string;
      source_key: string | null;
      source_name: string | null;
    }>;
    for (const r of rows) {
      const fam = missionFamilyFromKey(r.source_key) ?? r.source_name ?? null;
      if (!fam) continue;
      if (!byBlueprint.has(r.blueprint_id)) byBlueprint.set(r.blueprint_id, new Set());
      byBlueprint.get(r.blueprint_id)!.add(fam);
      familyCounts.set(fam, (familyCounts.get(fam) ?? 0) + 1);
    }
    if (rows.length < PAGE) break;
  }
  const families = Array.from(familyCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([f]) => f);
  return { byBlueprint, families };
}

// Parse the armor/gear body-part out of output_item_class. Classes look like
// "armor_light_helmet_01" or "behr_core_medium_01". We look for a short list
// of known part names anywhere in the string.
const BODY_PARTS = [
  "helmet",
  "core",
  "arms",
  "legs",
  "torso",
  "backpack",
  "undersuit",
  "boots",
  "gloves",
] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

export function bodyPartFromClass(cls: string | null | undefined): BodyPart | null {
  if (!cls) return null;
  const lower = cls.toLowerCase();
  for (const p of BODY_PARTS) {
    if (lower.includes(p)) return p;
  }
  return null;
}

// Classify a weapon blueprint by its class-name token. scunpacked class
// names follow the pattern `<manufacturer>_<kind>_<damage>_<variant>`
// (e.g. behr_rifle_ballistic_01, klwe_pistol_energy_01) so the second
// underscore token reliably names the weapon kind. Falls back to a
// substring search on the blueprint name for edge cases.
const WEAPON_KINDS = [
  "pistol",
  "rifle",
  "smg",
  "lmg",
  "shotgun",
  "sniper",
  "launcher",
  "grenade",
] as const;
export type WeaponKind = (typeof WEAPON_KINDS)[number];

export function weaponKindFromBlueprint(b: {
  output_item_class?: string | null;
  output_item_name?: string | null;
  name?: string;
}): WeaponKind | null {
  const cls = (b.output_item_class ?? "").toLowerCase();
  const nm = (b.output_item_name ?? b.name ?? "").toLowerCase();
  const hay = `${cls} ${nm}`;
  for (const k of WEAPON_KINDS) {
    // Match whole tokens in class, or substring in name
    if (cls.includes(`_${k}_`) || cls.endsWith(`_${k}`) || nm.includes(k)) {
      return k;
    }
  }
  return null;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function missionFamilyFromKey(key: string | null | undefined): string | null {
  if (!key) return null;
  // "BP_MISSIONREWARD_CitizensForProsperityDestroyItems_AB" → "Citizens For Prosperity"
  const cleaned = key
    .replace(/^BP_MISSIONREWARD_/i, "")
    .replace(/^BP_/i, "")
    // Trim trailing single/double letter variant tags ("_A", "_AB")
    .replace(/_[A-Z]{1,3}$/i, "");
  // Take the leading PascalCase run as the "family"
  const match = cleaned.match(/^([A-Z][a-z]+(?:[A-Z][a-z]+)*)/);
  const fam = match ? match[1] : cleaned;
  // Space out PascalCase
  return fam.replace(/([a-z])([A-Z])/g, "$1 $2");
}

// User blueprint ownership
export async function fetchOwnedBlueprintIds(userId: string): Promise<Set<string>> {
  const client = createClient();
  const PAGE = 1000;
  const out = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("user_blueprints")
      .select("blueprint_id")
      .eq("user_id", userId)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ blueprint_id: string }>;
    for (const r of rows) out.add(r.blueprint_id);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function markBlueprintOwned(userId: string, blueprintId: string): Promise<void> {
  const client = createClient();
  const { error } = await client
    .from("user_blueprints")
    .upsert({ user_id: userId, blueprint_id: blueprintId }, { onConflict: "user_id,blueprint_id" });
  if (error) throw error;
}

export async function unmarkBlueprintOwned(userId: string, blueprintId: string): Promise<void> {
  const client = createClient();
  const { error } = await client
    .from("user_blueprints")
    .delete()
    .eq("user_id", userId)
    .eq("blueprint_id", blueprintId);
  if (error) throw error;
}

// Reverse lookup: which blueprints, when dismantled, yield the given
// refined material? This is our best proxy for "what blueprints use this
// resource" — game data doesn't expose direct crafting requirements per
// resource (slots are abstract groups), but Dismantle.Returns is canonical.
//
// IMPORTANT: matching is by NAME, not UUID. The `resources` table holds
// MineableRock_* entries (e.g. UUID 1c949ce0... for Aluminum-bearing rock).
// Blueprint Dismantle.Returns yield REFINED materials with their own UUIDs
// (e.g. Aluminum = 48c7080a...). Different namespace. Names overlap reliably
// (the rock name ends in "_Aluminum", the refined material name is "Aluminum"),
// so a name-based containment query works for both.
//
// Uses Postgres jsonb containment (@>) which scans ~1k blueprints per call.
// Sub-100ms without an index; we'll add GIN later if it shows up in latency.
export async function fetchBlueprintsThatYield(
  materialName: string,
): Promise<Blueprint[]> {
  const client = createClient();
  const { data, error } = await client
    .from("blueprints")
    .select(LIST_COLS + ", source_data")
    .filter(
      "source_data->Dismantle->Returns",
      "cs",
      JSON.stringify([{ Name: materialName }]),
    )
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as Blueprint[];
}

// Derive the refined-material name from a resource row's name/key.
// "MineableRock_AsteroidCommon_Aluminum" → "Aluminum".
// Falls back to the input itself if no underscore convention applies.
export function refinedMaterialFromResourceName(s: string | null | undefined): string | null {
  if (!s) return null;
  const parts = s.split("_");
  if (parts.length === 0) return s;
  // Last segment is the material in scunpacked's naming convention.
  return parts[parts.length - 1] || s;
}

// All distinct refined-material names known across the blueprint catalog,
// sorted by frequency (most-yielded first) then alphabetically. Used to
// power the "yields material X" filter on the /blueprints page.
export async function fetchKnownDismantleMaterials(): Promise<
  Array<{ name: string; uuid: string; count: number }>
> {
  const client = createClient();
  const PAGE = 1000;
  const counts = new Map<string, { uuid: string; count: number }>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("blueprints")
      .select("source_data")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ source_data: unknown }>;
    for (const r of rows) {
      const dm = (r.source_data as { Dismantle?: { Returns?: DismantleReturn[] } } | null)
        ?.Dismantle;
      const returns = dm?.Returns;
      if (!Array.isArray(returns)) continue;
      for (const x of returns) {
        if (!x?.Name || !x?.UUID) continue;
        const cur = counts.get(x.Name);
        if (cur) cur.count += 1;
        else counts.set(x.Name, { uuid: x.UUID, count: 1 });
      }
    }
    if (rows.length < PAGE) break;
  }
  return Array.from(counts.entries())
    .map(([name, v]) => ({ name, uuid: v.uuid, count: v.count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function uniqueValues<T extends keyof Blueprint>(
  blueprints: Blueprint[],
  key: T,
): string[] {
  const set = new Set<string>();
  for (const b of blueprints) {
    const v = b[key];
    if (typeof v === "string" && v.trim()) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function displayName(b: Blueprint): string {
  return b.output_item_name || b.name || b.output_item_class || b.key;
}

export function formatCraftTime(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

export function prettyType(type: string | null): string {
  if (!type) return "—";
  // WeaponPersonal → "Weapon (Personal)"; ShipItem → "Ship Item"
  return type.replace(/([A-Z])/g, " $1").trim();
}

// Human-readable label for a blueprint_sources row.
// source_kind: reward_pool | shop | mission | drop
// source_key: e.g. "BP_MISSIONREWARD_CitizensForProsperityDestroyItems_AB"
export function prettySource(s: BlueprintSource): string {
  const kindLabel =
    s.source_kind === "reward_pool"
      ? "Mission Reward"
      : s.source_kind === "shop"
        ? "Shop"
        : s.source_kind === "mission"
          ? "Mission"
          : s.source_kind === "drop"
            ? "Drop"
            : s.source_kind;
  if (s.source_name) return `${kindLabel}: ${s.source_name}`;
  if (s.source_key) {
    const cleaned = s.source_key
      .replace(/^BP_MISSIONREWARD_/, "")
      .replace(/^BP_/, "")
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim();
    return `${kindLabel}: ${cleaned}`;
  }
  return kindLabel;
}
