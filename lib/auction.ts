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

/** wts = Want To Sell (offering an item). wtb = Want To Buy (looking
 *  for an item). Default in the schema is 'wts' so legacy rows behave
 *  the same as before. */
export type ListingType = "wts" | "wtb";

/** Unit the quantity is measured in.
 *  - "each"  → discrete items (a ship, a weapon)
 *  - "scu"   → standard cargo SCU (raw commodities)
 *  - "cscu"  → Crafting SCU (refined materials, used by the crafting system) */
export type AuctionUnit = "each" | "scu" | "cscu";

/** Minimum acceptable quality for refined materials (1-1000 in-game).
 *  Use null to mean "any quality / not specified". */
export type QualityMin = number | null;

export interface AuctionListing {
  id: string;
  user_id: string;
  listing_type: ListingType;
  item_name: string;
  item_category: AuctionCategory;
  quantity: number;
  /** Unit the quantity is in. Defaults to "each" so legacy rows render as before. */
  unit: AuctionUnit;
  /** Minimum quality (1-1000) — only meaningful for refined materials, typically with unit=cscu. */
  quality_min: number | null;
  /** Quantity of currency the seller wants. */
  price_amount: number;
  /** "aUEC" or any commodity name (Gold, Quantanium, Tungsten, …). */
  price_currency: string;
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
  seller_rsi_handle?: string | null;
  seller_avatar?: string | null;
  seller_is_admin?: boolean | null;
  seller_is_moderator?: boolean | null;
}

/** The seller's preferred in-game identifier — RSI handle first since
 *  that's what other players use to find them in-game, then any
 *  display_name they set, then Discord, with "Citizen" as last resort. */
export function sellerInGameName(l: AuctionListing): string {
  return (
    l.seller_rsi_handle?.trim() ||
    l.seller_display_name?.trim() ||
    l.seller_discord?.trim() ||
    "Citizen"
  );
}

const COLS = `id, user_id, listing_type, item_name, item_category, quantity,
  unit, quality_min,
  price_amount, price_currency, price_per_unit,
  condition, description, status, sold_to_handle,
  created_at, updated_at, expires_at,
  seller_display_name, seller_discord, seller_rsi_handle, seller_avatar,
  seller_is_admin, seller_is_moderator`;

export async function fetchActiveListings(opts?: {
  category?: AuctionCategory;
  currency?: string;
  listingType?: ListingType;
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
  if (opts?.currency) q = q.eq("price_currency", opts.currency);
  if (opts?.listingType) q = q.eq("listing_type", opts.listingType);
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
  listing_type: ListingType;
  item_name: string;
  item_category: AuctionCategory;
  quantity: number;
  unit?: AuctionUnit;
  quality_min?: number | null;
  price_amount: number;
  price_currency: string;
  price_per_unit: boolean;
  condition?: string;
  description?: string;
}): Promise<AuctionListing> {
  const client = createClient();
  // Listings auto-expire 7 days after posting. If a buyer bites and the
  // user marks it sold/filled, the row stays around regardless. Keeping
  // this fixed so the UI stays simple — no picker, no surprises.
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("auction_listings")
    .insert({
      user_id: input.user_id,
      listing_type: input.listing_type,
      item_name: input.item_name,
      item_category: input.item_category,
      quantity: input.quantity,
      unit: input.unit ?? "each",
      quality_min: input.quality_min ?? null,
      price_amount: input.price_amount,
      price_currency: input.price_currency,
      price_per_unit: input.price_per_unit,
      condition: input.condition ?? null,
      description: input.description ?? null,
      expires_at: expiresAt,
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

// ── Currencies + commodities ──

// Pull the commodity list from the catalog and pre-pend aUEC. Used by
// the New Listing form's currency dropdown and the browse-page filter.
// Returns lightweight {value, label} options; cached in-memory per page
// load since the commodity catalog rarely changes.
export interface CurrencyOption {
  value: string;        // exact string we store in price_currency
  label: string;        // human label (often == value)
  isAuec?: boolean;
  kind?: string | null; // commodity kind for grouping in UI (Metal, Gas, etc.)
}

export async function fetchCurrencyOptions(): Promise<CurrencyOption[]> {
  const client = createClient();
  // Just commodity names + kinds — we don't need full rows
  const { data, error } = await client
    .from("commodities")
    .select("name, kind")
    .order("name", { ascending: true })
    .range(0, 9999);
  if (error) {
    // If commodities aren't available, at least give the user aUEC
    return [{ value: "aUEC", label: "aUEC", isAuec: true }];
  }
  const opts: CurrencyOption[] = [
    { value: "aUEC", label: "aUEC (in-game credits)", isAuec: true },
    // Well-known non-commodity trade tokens — handy as currencies but
    // they don't live in the commodities table.
    ...SPECIAL_CURRENCIES,
  ];
  for (const c of (data ?? []) as Array<{ name: string; kind: string | null }>) {
    const name = c.name?.trim();
    if (!name) continue;
    opts.push({ value: name, label: name, kind: c.kind });
  }
  return opts;
}

/** Currencies that aren't commodities but are commonly used in trades.
 *  Wikelo Favors come from the Wikelo's Treasure Hoard NPC trade loop;
 *  RMC + Construction Material come from salvage; CM is the standard
 *  unit for engineering / repair contracts. */
const SPECIAL_CURRENCIES: CurrencyOption[] = [
  { value: "Wikelo Favors", label: "Wikelo Favors", kind: "Trade tokens" },
  { value: "RMC", label: "RMC (Recycled Material Composite)", kind: "Trade tokens" },
  { value: "Construction Material", label: "Construction Material", kind: "Trade tokens" },
  { value: "Custom", label: "Custom (type your own)…", kind: "Trade tokens" },
];

// ── Item-name suggestions (typeahead) ──
//
// Maps an auction category to the catalog table that contains its items
// and runs an ilike search. Returns at most `limit` names. Categories
// without a backing catalog (paint, armor, consumable, other) return an
// empty list — the form falls back to free text.

const CATEGORY_TO_TABLE: Partial<Record<AuctionCategory, string>> = {
  ship: "ships",
  vehicle: "ships",       // ground vehicles share the ships table
  weapon: "weapons",
  component: "components",
  blueprint: "blueprints",
  cargo: "commodities",
};

export async function fetchItemSuggestions(
  category: AuctionCategory,
  query: string,
  limit = 8,
): Promise<string[]> {
  const table = CATEGORY_TO_TABLE[category];
  const trimmed = query.trim();
  if (!table || trimmed.length < 2) return [];
  const client = createClient();
  const { data, error } = await client
    .from(table)
    .select("name")
    .ilike("name", `%${trimmed}%`)
    .order("name", { ascending: true })
    .limit(limit);
  if (error) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of (data ?? []) as Array<{ name: string | null }>) {
    const n = row.name?.trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    out.push(n);
  }
  return out;
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

/**
 * Format a price for display. aUEC gets the K/M/B abbreviation since
 * the numbers go big; commodity prices are usually small SCU counts so
 * they render plain ("12 SCU Gold", "350 Tungsten").
 */
export function formatPrice(amount: number, currency: string): string {
  if (currency === "aUEC") {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B aUEC`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M aUEC`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K aUEC`;
    return `${amount.toLocaleString()} aUEC`;
  }
  // Commodity payment — show units of the commodity (typically SCU)
  return `${amount.toLocaleString()} ${currency}`;
}

// Backward-compat alias — old callers still use formatAuec().
export function formatAuec(n: number): string {
  return formatPrice(n, "aUEC");
}

/** Render quantity + unit ("10 CSCU", "350 SCU", "qty 3"). */
export function formatQuantity(qty: number, unit: AuctionUnit): string {
  if (unit === "scu") return `${qty.toLocaleString()} SCU`;
  if (unit === "cscu") return `${qty.toLocaleString()} CSCU`;
  return `qty ${qty.toLocaleString()}`;
}

export const UNIT_LABELS: Record<AuctionUnit, string> = {
  each: "Each (whole items)",
  scu: "SCU (cargo)",
  cscu: "CSCU (refined / crafting)",
};

// ── Listing-type display helpers ──
// Centralised labels so WTS / WTB language is consistent everywhere.
export const LISTING_TYPE_LABELS: Record<ListingType, {
  badge: string;          // short tag for cards (WTS / WTB)
  full: string;           // long form for headers
  verb: string;           // "Selling" / "Buying"
  cta: string;            // call-to-action button text
  priceLabel: string;     // "Asking price" / "Buying budget"
  contactCta: string;     // "Ping seller" / "Ping buyer"
  finishedLabel: string;  // "SOLD" / "FILLED"
  badgeColor: string;     // CSS color hint
}> = {
  wts: {
    badge: "WTS",
    full: "Want to sell",
    verb: "Selling",
    cta: "Sell an item",
    priceLabel: "Asking price",
    contactCta: "Ping seller on Discord",
    finishedLabel: "SOLD",
    badgeColor: "var(--success)",
  },
  wtb: {
    badge: "WTB",
    full: "Want to buy",
    verb: "Buying",
    cta: "Post a buy request",
    priceLabel: "Buying budget",
    contactCta: "Ping buyer on Discord",
    finishedLabel: "FILLED",
    badgeColor: "var(--warn)",
  },
};
