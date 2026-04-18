import { createClient } from "./supabase/client";

export type IntelStatus = "draft" | "pending" | "published" | "rejected";
export type IntelKind =
  | "location"
  | "mission_reward"
  | "pirate_activity"
  | "shop_stock"
  | "general";

export type EntityType =
  | "ship"
  | "weapon"
  | "component"
  | "commodity"
  | "blueprint"
  | "recipe"
  | "resource"
  | "general";

export interface IntelReport {
  id: string;
  user_id: string;
  entity_type: EntityType | null;
  entity_id: string | null;
  kind: IntelKind;
  status: IntelStatus;
  title: string;
  body: string | null;
  location_hint: string | null;
  confirmed_count: number;
  game_version: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

const COLS =
  "id, user_id, entity_type, entity_id, kind, status, title, body, location_hint, confirmed_count, game_version, metadata, created_at, updated_at, published_at";

// Public feed: all published reports for an entity
export async function fetchPublishedIntel(
  entityType: EntityType,
  entityId: string,
): Promise<IntelReport[]> {
  const client = createClient();
  const { data, error } = await client
    .from("intel_reports")
    .select(COLS)
    .eq("status", "published")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IntelReport[];
}

// Fetch a single user's own reports for an entity (to show pending/draft)
export async function fetchMyIntelForEntity(
  userId: string,
  entityType: EntityType,
  entityId: string,
): Promise<IntelReport[]> {
  const client = createClient();
  const { data, error } = await client
    .from("intel_reports")
    .select(COLS)
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IntelReport[];
}

export async function submitIntel(input: {
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  kind: IntelKind;
  title: string;
  body?: string;
  location_hint?: string;
  game_version?: string;
}): Promise<IntelReport> {
  const client = createClient();
  const { data, error } = await client
    .from("intel_reports")
    .insert({
      user_id: input.user_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      kind: input.kind,
      status: "pending",
      title: input.title,
      body: input.body ?? null,
      location_hint: input.location_hint ?? null,
      game_version: input.game_version ?? null,
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as IntelReport;
}

// Moderator: fetch all pending reports (RLS enforces moderator-only read via policy)
export async function fetchPendingIntel(): Promise<IntelReport[]> {
  const client = createClient();
  const { data, error } = await client
    .from("intel_reports")
    .select(COLS)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as IntelReport[];
}

// Moderator actions
export async function publishReport(id: string): Promise<void> {
  const client = createClient();
  const { error } = await client
    .from("intel_reports")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function rejectReport(id: string): Promise<void> {
  const client = createClient();
  const { error } = await client
    .from("intel_reports")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) throw error;
}

export async function checkIsModerator(userId: string): Promise<boolean> {
  const client = createClient();
  const { data, error } = await client
    .from("profiles")
    .select("is_moderator")
    .eq("id", userId)
    .maybeSingle();
  if (error) return false;
  return Boolean((data as { is_moderator?: boolean } | null)?.is_moderator);
}

export const KIND_LABELS: Record<IntelKind, string> = {
  location: "Spawn / location",
  mission_reward: "Mission reward",
  pirate_activity: "Pirate activity",
  shop_stock: "Shop stock",
  general: "General intel",
};

export function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const d = (now - then) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 86400 * 30) return `${Math.floor(d / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
