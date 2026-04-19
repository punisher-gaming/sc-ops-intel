import { createClient } from "./supabase/client";

export type AuctionCategory =
  | "ship"
  | "vehicle"
  | "weapon"
  | "armor"
  | "component"
  | "paint"
  | "blueprint"
  | "consumable"
  | "cargo"
  | "other";

export type AuctionStatus = "active" | "sold" | "cancelled" | "expired";

export interface AuctionListing {
  id: string;
  user_id: string;
  item_name: string;
  item_category: AuctionCategory;
  quantity: number;
  price_auec: number;
  price_per_unit: boolean;
  condition: string | null;
  description: string | null;
  status: AuctionStatus;
  sold_to_handle: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  // From the joined view — seller display info
  seller_display_name?: string | null;
  seller_discord?: string | null;
  seller_avatar?: string | null;
  seller_is_admin?: boolean | null;
  seller_is_moderator?: boolean | null;
}

const COLS = `id, user_id, item_name, item_category, quantity, price_auec,
  price_per_unit, condition, description, status, sold_to_handle,
  created_at, updated_at, expires_at,
  seller_display_name, seller_discord, seller_avatar,
  seller_is_admin, seller_is_moderator`;

export async function fetchActiveListings(opts?: {
  category?: AuctionCategory;
  search?: string;
  limit?: number;
}): Promise<AuctionListing[]> {
  const client = createClient();
  let q = client
    .from("auction_listings_with_seller")
    .select(COLS)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 200);
  if (opts?.category) q = q.eq("item_category", opts.category);
  if (opts?.search && opts.search.trim()) {
    q = q.ilike("item_name", `%${opts.search.trim()}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AuctionListing[];
}

export async function fetchListing(id: string): Promise<AuctionListing | null> {
  const client = createClient();
  const { data, error } = await client
    .from("auction_listings_with_seller")
    .select(COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as AuctionListing | null;
}

export async function fetchMyListings(userId: string): Promise<AuctionListing[]> {
  const client = createClient();
  const { data, error } = await client
    .from("auction_listings_with_seller")
    .select(COLS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AuctionListing[];
}

export async function fetchListingsBySeller(userId: string): Promise<AuctionListing[]> {
  const client = createClient();
  const { data, error } = await client
    .from("auction_listings_with_seller")
    .select(COLS)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AuctionListing[];
}

export async function createListing(input: {
  user_id: string;
  item_name: string;
  item_category: AuctionCategory;
  quantity: number;
  price_auec: number;
  price_per_unit: boolean;
  condition?: string;
  description?: string;
}): Promise<AuctionListing> {
  const client = createClient();
  const { data, error } = await client
    .from("auction_listings")
    .insert({
      user_id: input.user_id,
      item_name: input.item_name,
      item_category: input.item_category,
      quantity: input.quantity,
      price_auec: input.price_auec,
      price_per_unit: input.price_per_unit,
      condition: input.condition ?? null,
      description: input.description ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AuctionListing;
}

export async function updateListingStatus(
  id: string,
  status: AuctionStatus,
  soldToHandle?: string,
): Promise<void> {
  const client = createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "sold" && soldToHandle) patch.sold_to_handle = soldToHandle;
  const { error } = await client.from("auction_listings").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteListing(id: string): Promise<void> {
  const client = createClient();
  const { error } = await client.from("auction_listings").delete().eq("id", id);
  if (error) throw error;
}

// ── Helpers ──

export const CATEGORY_LABELS: Record<AuctionCategory, string> = {
  ship: "Ship",
  vehicle: "Ground Vehicle",
  weapon: "Weapon",
  armor: "Armor",
  component: "Component",
  paint: "Paint / Skin",
  blueprint: "Blueprint",
  consumable: "Consumable",
  cargo: "Cargo / Material",
  other: "Other",
};

export function formatAuec(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B aUEC`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M aUEC`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K aUEC`;
  return `${n.toLocaleString()} aUEC`;
}
