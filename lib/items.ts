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
  // Projected from source_data.stdItem.DescriptionData.Class at list-fetch
  // time. Detail fetch resolves via itemClass() instead.
  item_class?: string | null;
  // Projected for hover tooltips on list rows — keeps the payload small
  // (~100 bytes per row) vs. fetching full source_data jsonb. We skip
  // "Item Type" since it has a space (PostgREST jsonb arrow doesn't love
  // that) and the existing `type` column carries the same info.
  description?: string | null;
  meta_grade?: string | null;
}

const LIST_COLS =
  "id, class_name, name, manufacturer, type, subtype, classification, grade, size, tags, game_version, last_synced_at";

// For list views we also want the in-game "Class" (Industrial / Military /
// Civilian / Stealth / Competition) plus the marketing blurb for the
// hover tooltip. All live inside source_data jsonb, so we project just
// those paths via PostgREST's jsonb arrows.
const LIST_COLS_WITH_CLASS =
  LIST_COLS +
  ", item_class:source_data->stdItem->DescriptionData->>Class" +
  ", description:source_data->stdItem->>DescriptionText" +
  ", meta_grade:source_data->stdItem->DescriptionData->>Grade";

export async function fetchItems(table: "weapons" | "components"): Promise<Item[]> {
  const client = createClient();
  const PAGE = 1000;
  const out: Item[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from(table)
      .select(LIST_COLS_WITH_CLASS)
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as Item[];
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

// In-game, ship components use letter grades (A/B/C/D/…) while scunpacked
// stores them as 1/2/3/4. Mapper is 1=A, 2=B, 3=C, 4=D, 5=E, 6=F.
// Applied at render time so we don't lose the original number in the DB.
export type GradeStyle = "number" | "letter";

export function formatGrade(
  grade: number | null | undefined,
  style: GradeStyle = "number",
): string {
  if (grade == null) return "—";
  if (style === "letter") {
    // 1 → A, 2 → B, etc. Falls back to the number for anything out of A–F.
    const letters = ["A", "B", "C", "D", "E", "F"];
    return letters[grade - 1] ?? String(grade);
  }
  return String(grade);
}

// Component class — Industrial / Military / Civilian / Stealth / Competition
// — lives in source_data.stdItem.DescriptionData.Class. Not all items have
// one (weapons usually don't; ship components usually do).
export function itemClass(item: Item): string | null {
  // List fetches project this as item_class; detail fetches include the
  // full source_data. Use whichever we have.
  if (typeof item.item_class === "string" && item.item_class.trim()) {
    return item.item_class.trim();
  }
  const sd = (item.source_data ?? {}) as {
    stdItem?: { DescriptionData?: { Class?: string } };
  };
  const c = sd.stdItem?.DescriptionData?.Class;
  return typeof c === "string" && c.trim() ? c.trim() : null;
}
