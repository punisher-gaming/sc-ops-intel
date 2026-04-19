import { createClient } from "./supabase/client";

export interface Ship {
  id: string;
  game_version: string | null;
  name: string;
  manufacturer: string | null;
  role: string | null;
  size_class: string | null;
  hull_hp: number | null;
  shields_hp: number | null;
  scm_speed: number | null;
  max_speed: number | null;
  cargo_scu: number | null;
  crew_min: number | null;
  crew_max: number | null;
  last_synced_at: string | null;
  source_data?: Record<string, unknown> | null;
}

const LIST_COLS =
  "id, game_version, name, manufacturer, role, size_class, hull_hp, shields_hp, scm_speed, max_speed, cargo_scu, crew_min, crew_max, last_synced_at";

export async function fetchShips(): Promise<Ship[]> {
  const client = createClient();
  const PAGE = 1000;
  const out: Ship[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("ships")
      .select(LIST_COLS)
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Ship[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function fetchShip(id: string): Promise<Ship | null> {
  const client = createClient();
  const { data, error } = await client
    .from("ships")
    .select(LIST_COLS + ", source_data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Ship | null;
}

export function uniqueValues<T extends keyof Ship>(ships: Ship[], key: T): string[] {
  const set = new Set<string>();
  for (const s of ships) {
    const v = s[key];
    if (typeof v === "string" && v.trim()) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function formatNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

// Defensive parse for ship.size_class — the SC Wiki ingest stored the raw
// localization object ({"en_EN":"small","de_DE":"Klein",...}) as the
// column value for some ships. Try to recover a readable English label
// from any of: a normal string, a JSON-string-of-object, or an object.
export function shipSize(ship: Ship): string {
  const raw = ship.size_class;
  if (raw == null) return "—";
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return (o.en_EN ?? o.en ?? Object.values(o)[0] ?? "—") as string;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as Record<string, string>;
        return parsed.en_EN ?? parsed.en ?? Object.values(parsed)[0] ?? trimmed;
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  return "—";
}

export function formatCrew(ship: Ship): string {
  const { crew_min, crew_max } = ship;
  if (crew_min == null && crew_max == null) return "—";
  if (crew_min != null && crew_max != null && crew_min !== crew_max) {
    return `${crew_min}–${crew_max}`;
  }
  return String(crew_max ?? crew_min);
}

// Pull physical dimensions (length / beam / height in meters) from the SC
// Wiki payload stashed in source_data. Used by the fleet compare view.
export function shipDimensions(ship: Ship): {
  length: number | null;
  beam: number | null;
  height: number | null;
} {
  const sd = (ship.source_data ?? {}) as Record<string, unknown>;
  const pick = (obj: unknown): number | null => {
    const v = obj as number | string | null | undefined;
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const sizes = sd.sizes as Record<string, unknown> | undefined;
  const dim = sd.dimension as Record<string, unknown> | undefined;
  return {
    length: pick(sizes?.length) ?? pick(dim?.length) ?? null,
    beam: pick(sizes?.beam) ?? pick(dim?.width) ?? null,
    height: pick(sizes?.height) ?? pick(dim?.height) ?? null,
  };
}

// Fetch multiple ships by id (for compare view). Supabase's .in() is
// fine up to a few hundred.
export async function fetchShipsByIds(ids: string[]): Promise<Ship[]> {
  if (ids.length === 0) return [];
  const client = createClient();
  const { data, error } = await client
    .from("ships")
    .select(LIST_COLS + ", source_data")
    .in("id", ids);
  if (error) throw error;
  return (data ?? []) as unknown as Ship[];
}
