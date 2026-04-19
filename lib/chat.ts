import { createClient } from "./supabase/client";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

export interface Thread {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  body: string;
  pinned: boolean;
  locked: boolean;
  score: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface Reply {
  id: string;
  thread_id: string;
  user_id: string;
  body: string;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface Author {
  id: string;
  display_name: string | null;
  discord_username: string | null;
  avatar_url: string | null;
  is_moderator: boolean;
  is_admin: boolean;
}

export type SortMode = "hot" | "new" | "top";

const T_COLS =
  "id, category_id, user_id, title, body, pinned, locked, score, reply_count, created_at, updated_at, last_activity_at";
const R_COLS = "id, thread_id, user_id, body, score, created_at, updated_at";

export async function fetchCategories(): Promise<Category[]> {
  const client = createClient();
  const { data, error } = await client
    .from("chat_categories")
    .select("id, name, description, display_order")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function fetchCategory(id: string): Promise<Category | null> {
  const client = createClient();
  const { data, error } = await client
    .from("chat_categories")
    .select("id, name, description, display_order")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Category | null;
}

export async function fetchThreads(categoryId: string, sort: SortMode): Promise<Thread[]> {
  const client = createClient();
  let q = client
    .from("chat_threads")
    .select(T_COLS)
    .eq("category_id", categoryId)
    .eq("deleted", false);

  // Always pinned-first
  if (sort === "hot") {
    q = q.order("pinned", { ascending: false }).order("last_activity_at", { ascending: false });
  } else if (sort === "new") {
    q = q.order("pinned", { ascending: false }).order("created_at", { ascending: false });
  } else {
    q = q.order("pinned", { ascending: false }).order("score", { ascending: false }).order("created_at", { ascending: false });
  }
  q = q.limit(100);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Thread[];
}

export async function fetchThread(id: string): Promise<Thread | null> {
  const client = createClient();
  const { data, error } = await client
    .from("chat_threads")
    .select(T_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Thread | null;
}

export async function fetchReplies(threadId: string): Promise<Reply[]> {
  const client = createClient();
  const { data, error } = await client
    .from("chat_replies")
    .select(R_COLS)
    .eq("thread_id", threadId)
    .eq("deleted", false)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Reply[];
}

export async function createThread(input: {
  category_id: string;
  user_id: string;
  title: string;
  body: string;
}): Promise<Thread> {
  const client = createClient();
  const { data, error } = await client
    .from("chat_threads")
    .insert({
      category_id: input.category_id,
      user_id: input.user_id,
      title: input.title,
      body: input.body,
    })
    .select(T_COLS)
    .single();
  if (error) throw error;
  return data as Thread;
}

export async function createReply(input: {
  thread_id: string;
  user_id: string;
  body: string;
}): Promise<Reply> {
  const client = createClient();
  const { data, error } = await client
    .from("chat_replies")
    .insert({
      thread_id: input.thread_id,
      user_id: input.user_id,
      body: input.body,
    })
    .select(R_COLS)
    .single();
  if (error) throw error;
  return data as Reply;
}

export async function fetchAuthors(uids: string[]): Promise<Map<string, Author>> {
  if (uids.length === 0) return new Map();
  const client = createClient();
  const { data, error } = await client.rpc("chat_authors", { uids: Array.from(new Set(uids)) });
  if (error) throw error;
  const map = new Map<string, Author>();
  for (const a of (data ?? []) as Author[]) map.set(a.id, a);
  return map;
}

// === Voting ===

export interface VoteRow {
  user_id: string;
  target_type: "thread" | "reply";
  target_id: string;
  value: -1 | 1;
}

export async function fetchMyVotes(
  userId: string,
  targetType: "thread" | "reply",
  targetIds: string[],
): Promise<Map<string, -1 | 1>> {
  if (targetIds.length === 0) return new Map();
  const client = createClient();
  const { data, error } = await client
    .from("chat_votes")
    .select("target_id, value")
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .in("target_id", targetIds);
  if (error) throw error;
  const map = new Map<string, -1 | 1>();
  for (const r of (data ?? []) as Array<{ target_id: string; value: -1 | 1 }>) {
    map.set(r.target_id, r.value);
  }
  return map;
}

export async function castVote(
  userId: string,
  targetType: "thread" | "reply",
  targetId: string,
  value: -1 | 0 | 1,
): Promise<void> {
  const client = createClient();
  if (value === 0) {
    const { error } = await client
      .from("chat_votes")
      .delete()
      .eq("user_id", userId)
      .eq("target_type", targetType)
      .eq("target_id", targetId);
    if (error) throw error;
    return;
  }
  const { error } = await client
    .from("chat_votes")
    .upsert(
      { user_id: userId, target_type: targetType, target_id: targetId, value },
      { onConflict: "user_id,target_type,target_id" },
    );
  if (error) throw error;
}

// Moderator
export async function setThreadFlags(
  id: string,
  flags: { pinned?: boolean; locked?: boolean; deleted?: boolean },
): Promise<void> {
  const client = createClient();
  const { error } = await client.from("chat_threads").update(flags).eq("id", id);
  if (error) throw error;
}

export async function softDeleteReply(id: string): Promise<void> {
  const client = createClient();
  const { error } = await client.from("chat_replies").update({ deleted: true }).eq("id", id);
  if (error) throw error;
}

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
