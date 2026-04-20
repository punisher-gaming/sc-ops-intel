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
  if (!k) return ", ";
  return k.replace(/_/g, " ").replace(/^([a-z])/, (m) => m.toUpperCase());
}

// === Availability (canonical) ===
export interface CommodityAvailabilityRow {
  id: number;
  commodity_id: string;
  trade_location_id: string;
  kind: "sold" | "bought";
  starmap_object_uuid: string | null;
  tag_name: string | null;
  // Joined
  trade_location?: {
    id: string;
    name: string;
    system: string | null;
    planet: string | null;
    place: string | null;
    kind: string | null;
  };
  commodity?: {
    id: string;
    name: string;
    kind: string | null;
  };
}

export async function fetchAvailabilityForCommodity(
  commodityId: string,
): Promise<CommodityAvailabilityRow[]> {
  const client = createClient();
  const { data, error } = await client
    .from("commodity_availability")
    .select(
      "id, commodity_id, trade_location_id, kind, starmap_object_uuid, tag_name, " +
        "trade_location:trade_locations(id, name, system, planet, place, kind)",
    )
    .eq("commodity_id", commodityId)
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as CommodityAvailabilityRow[];
}

export async function fetchAvailabilityForLocation(
  locationId: string,
): Promise<CommodityAvailabilityRow[]> {
  const client = createClient();
  const { data, error } = await client
    .from("commodity_availability")
    .select(
      "id, commodity_id, trade_location_id, kind, starmap_object_uuid, tag_name, " +
        "commodity:commodities(id, name, kind)",
    )
    .eq("trade_location_id", locationId)
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as CommodityAvailabilityRow[];
}

// === Community prices ===
export interface CommodityPrice {
  id: string;
  user_id: string;
  commodity_id: string;
  trade_location_id: string;
  kind: "buy" | "sell";
  price_auec: number;
  stock_scu: number | null;
  note: string | null;
  game_version: string | null;
  status: "pending" | "published" | "rejected";
  confirmed_count: number;
  reported_at: string;
  published_at: string | null;
}

export async function fetchPublishedPrices(
  commodityId: string,
  locationId?: string,
): Promise<CommodityPrice[]> {
  const client = createClient();
  let q = client
    .from("commodity_prices")
    .select(
      "id, user_id, commodity_id, trade_location_id, kind, price_auec, stock_scu, note, game_version, status, confirmed_count, reported_at, published_at",
    )
    .eq("status", "published")
    .eq("commodity_id", commodityId)
    .order("reported_at", { ascending: false })
    .limit(200);
  if (locationId) q = q.eq("trade_location_id", locationId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CommodityPrice[];
}

export async function submitPrice(input: {
  user_id: string;
  commodity_id: string;
  trade_location_id: string;
  kind: "buy" | "sell";
  price_auec: number;
  stock_scu?: number;
  note?: string;
  game_version?: string;
}): Promise<CommodityPrice> {
  const client = createClient();
  const { data, error } = await client
    .from("commodity_prices")
    .insert({
      user_id: input.user_id,
      commodity_id: input.commodity_id,
      trade_location_id: input.trade_location_id,
      kind: input.kind,
      price_auec: input.price_auec,
      stock_scu: input.stock_scu ?? null,
      note: input.note ?? null,
      game_version: input.game_version ?? null,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data as CommodityPrice;
}

// Aggregate helper, median of published prices per (location, kind).
export function priceStats(prices: CommodityPrice[]): {
  median: number | null;
  min: number | null;
  max: number | null;
  count: number;
  latest: CommodityPrice | null;
} {
  if (prices.length === 0)
    return { median: null, min: null, max: null, count: 0, latest: null };
  const nums = [...prices].map((p) => Number(p.price_auec)).sort((a, b) => a - b);
  const mid = Math.floor(nums.length / 2);
  const median = nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  return {
    median,
    min: nums[0],
    max: nums[nums.length - 1],
    count: nums.length,
    latest: [...prices].sort(
      (a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime(),
    )[0],
  };
}

export function formatAuec(n: number | null | undefined): string {
  if (n == null) return ", ";
  return `${Math.round(n).toLocaleString()} aUEC`;
}
