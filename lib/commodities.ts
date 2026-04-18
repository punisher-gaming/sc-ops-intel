import { createClient } from "./supabase/client";

export interface Commodity {
  id: string;
  code: string | null;
  name: string;
  kind: string | null;
  description: string | null;
  game_version: string | null;
  last_synced_at: string | null;
  source_data?: Record<string, unknown> | null;
}

export interface TradeLocation {
  id: string;
  name: string;
  system: string | null;
  planet: string | null;
  place: string | null;
  operator: string | null;
  kind: string | null;
  game_version: string | null;
  last_synced_at: string | null;
  source_data?: Record<string, unknown> | null;
}

const C_COLS =
  "id, code, name, kind, description, game_version, last_synced_at";
const T_COLS =
  "id, name, system, planet, place, operator, kind, game_version, last_synced_at";

async function fetchAllPaged<T>(
  tableName: string,
  cols: string,
  order: string,
): Promise<T[]> {
  const client = createClient();
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from(tableName)
      .select(cols)
      .order(order, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function fetchCommodities(): Promise<Commodity[]> {
  return fetchAllPaged<Commodity>("commodities", C_COLS, "name");
}

export async function fetchCommodity(id: string): Promise<Commodity | null> {
  const client = createClient();
  const { data, error } = await client
    .from("commodities")
    .select(C_COLS + ", source_data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Commodity | null;
}

export async function fetchTradeLocations(): Promise<TradeLocation[]> {
  return fetchAllPaged<TradeLocation>("trade_locations", T_COLS, "name");
}

export async function fetchTradeLocation(id: string): Promise<TradeLocation | null> {
  const client = createClient();
  const { data, error } = await client
    .from("trade_locations")
    .select(T_COLS + ", source_data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as TradeLocation | null;
}

export function uniqueValuesC<T extends keyof Commodity>(rows: Commodity[], key: T): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = r[key];
    if (typeof v === "string" && v.trim()) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function uniqueValuesT<T extends keyof TradeLocation>(rows: TradeLocation[], key: T): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = r[key];
    if (typeof v === "string" && v.trim()) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function prettyKind(k: string | null | undefined): string {
  if (!k) return "—";
  return k.replace(/_/g, " ").replace(/^([a-z])/, (m) => m.toUpperCase());
}
