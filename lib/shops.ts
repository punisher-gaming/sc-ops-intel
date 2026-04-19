import { createClient } from "./supabase/client";

export interface Shop {
  id: string;
  name: string;
  container_path: string | null;
  accepts_stolen_goods: boolean | null;
  profit_margin: number | null;
  game_version: string | null;
  last_synced_at: string | null;
}

export interface ShopInventoryRow {
  id: number;
  shop_id: string;
  item_reference: string;
  item_class_name: string | null;
  display_name: string | null;
  item_type: string | null;
  item_subtype: string | null;
  base_price: number | null;
  inventory_current: number | null;
  shop_buys_this: boolean;
  shop_sells_this: boolean;
  shop_rents_this: boolean;
  tags: string[] | null;
  // Joined shop info
  shop?: Shop;
}

// "Where can I buy / sell this item?" — one query, joined with the shop row
// so we can render location + price in a single pass.
export async function fetchItemShopInventory(
  itemReference: string,
): Promise<ShopInventoryRow[]> {
  const client = createClient();
  const { data, error } = await client
    .from("shop_inventory")
    .select(
      "id, shop_id, item_reference, item_class_name, display_name, item_type, item_subtype, base_price, inventory_current, shop_buys_this, shop_sells_this, shop_rents_this, tags, " +
        "shop:shops(id, name, container_path, accepts_stolen_goods, profit_margin)",
    )
    .eq("item_reference", itemReference)
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as ShopInventoryRow[];
}

export function formatAuecPrice(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${Math.round(n).toLocaleString()} aUEC`;
}

// The shop container_path is a slashy game-file path like
//   "Clothing\\Aparelli\\Aparelli_NewBabbage"
// The last segment often encodes the location: "Aparelli_NewBabbage".
// Split and return a readable "venue · planet/station" summary.
export function prettyShopLocation(shop: Shop | undefined): string {
  if (!shop?.container_path) return "";
  const parts = shop.container_path.split(/[\\/]/).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  // Common separator: "Aparelli_NewBabbage" → venue + location
  if (last.includes("_")) {
    const [venue, ...rest] = last.split("_");
    return rest.length ? `${venue} · ${rest.join(" ").replace(/([a-z])([A-Z])/g, "$1 $2")}` : venue;
  }
  return last;
}
