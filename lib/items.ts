// Shared lib for both weapons + components — same column shape, different
// table. We pass the table name in.

import { createClient } from "./supabase/client";

export interface Item {
  id: string;
  class_name: string;
  name: string;
  manufacturer: string | null;
  type: string;
  subtype: string | null;
  classification: string | null;
  grade: number | null;
  size: number | null;
  tags: string | null;
  game_version: string | null;
  last_synced_at: string | null;
  source_data?: Record<string, unknown> | null;
}

const LIST_COLS =
  "id, class_name, name, manufacturer, type, subtype, classification, grade, size, tags, game_version, last_synced_at";

export async function fetchItems(table: "weapons" | "components"): Promise<Item[]> {
  const client = createClient();
  const PAGE = 1000;
  const out: Item[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from(table)
      .select(LIST_COLS)
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Item[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function fetchItem(
  table: "weapons" | "components",
  id: string,
): Promise<Item | null> {
  const client = createClient();
  const { data, error } = await client
    .from(table)
    .select(LIST_COLS + ", source_data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Item | null;
}

export function uniqueItemValues<T extends keyof Item>(items: Item[], key: T): string[] {
  const set = new Set<string>();
  for (const i of items) {
    const v = i[key];
    if (typeof v === "string" && v.trim()) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function prettyType(t: string | null | undefined): string {
  if (!t) return "—";
  // CamelCase → spaced ("WeaponPersonal" → "Weapon Personal")
  return t.replace(/([a-z])([A-Z])/g, "$1 $2").trim();
}

export function isPlaceholderName(name: string | null | undefined): boolean {
  return !name || name.includes("PLACEHOLDER") || name.includes("<=");
}
