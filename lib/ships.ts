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

export function formatCrew(ship: Ship): string {
  const { crew_min, crew_max } = ship;
  if (crew_min == null && crew_max == null) return "—";
  if (crew_min != null && crew_max != null && crew_min !== crew_max) {
    return `${crew_min}–${crew_max}`;
  }
  return String(crew_max ?? crew_min);
}
