import { createClient } from "./supabase/client";

const NOTIFY_USER_URL =
  "https://sc-ops-intel-ingest.clint-150.workers.dev/notify/user";

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  context_listing_id: string | null;
  read_at: string | null;
  created_at: string;
  // Joined display info
  sender_name?: string | null;
  sender_discord?: string | null;
  sender_avatar?: string | null;
  recipient_name?: string | null;
  recipient_discord?: string | null;
  recipient_avatar?: string | null;
}

// Base columns on direct_messages itself, used by the insert path.
const BASE_COLS = `id, sender_id, recipient_id, body, context_listing_id, read_at, created_at`;
// Joined columns only available via the direct_messages_with_users view , 
// used by inbox + thread reads.
const COLS = `${BASE_COLS},
  sender_name, sender_discord, sender_avatar,
  recipient_name, recipient_discord, recipient_avatar`;

/** Result of sending a message, includes whether each side-channel
 *  actually landed so callers can show honest feedback. */
export interface SendResult {
  message: DirectMessage;
  /** true if the recipient had a Discord webhook AND it accepted. */
  pushedToDiscord: boolean;
  /** true if the recipient has email notifications on AND Resend accepted. */
  pushedToEmail: boolean;
}

/** Insert a new DM, then best-effort push to the recipient's Discord
 *  webhook (if they've configured one) AND to email (if enabled). Set
 *  `notifyExternal: false` for quiet in-site-only messages, back-and-
 *  forth chat that shouldn't blast their phone. */
export async function sendMessage(opts: {
  recipient_id: string;
  body: string;
  context_listing_id?: string;
  /** Sender display name, used in the Discord push. */
  sender_name?: string;
  /** Listing item name, included in the Discord push for context. */
  context_label?: string;
  /** Page URL to deep-link back to from Discord. */
  link?: string;
  /** Push to recipient's Discord + email too? Defaults true. Set false
   *  for quick replies that shouldn't trigger outside notifications. */
  notifyExternal?: boolean;
}): Promise<SendResult> {
  const client = createClient();
  const { data, error } = await client
    .from("direct_messages")
    .insert({
      recipient_id: opts.recipient_id,
      body: opts.body.trim(),
      context_listing_id: opts.context_listing_id ?? null,
    })
    // Base cols only, joined seller/recipient info lives on the view,
    // not the underlying table.
    .select(BASE_COLS)
    .single();
  if (error) throw error;

  // Best-effort fan-out to side channels (Discord + email). Failures
  // don't break the message send, it's already in the inbox. The
  // returned flags let the UI confirm or nudge the right channel.
  // If the sender opted for "quiet" mode, skip the worker call entirely.
  let pushedToDiscord = false;
  let pushedToEmail = false;
  if (opts.notifyExternal === false) {
    return { message: data as DirectMessage, pushedToDiscord, pushedToEmail };
  }
  try {
    const res = await fetch(NOTIFY_USER_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipient_id: opts.recipient_id,
        sender_name: opts.sender_name ?? "A CitizenDex user",
        body: opts.body.slice(0, 1500),
        context_label: opts.context_label ?? null,
        link: opts.link ?? null,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      pushedToDiscord?: boolean;
      pushedToEmail?: boolean;
    };
    pushedToDiscord = Boolean(body.pushedToDiscord);
    pushedToEmail = Boolean(body.pushedToEmail);
  } catch {
    /* ignore, message is already in the inbox */
  }

  return { message: data as DirectMessage, pushedToDiscord, pushedToEmail };
}

/** Mark every message in a thread (between current user and other user)
 *  as read. Idempotent, only updates rows still unread. */
export async function markThreadRead(otherUserId: string, currentUserId: string): Promise<void> {
  const client = createClient();
  const { error } = await client
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", currentUserId)
    .eq("sender_id", otherUserId)
    .is("read_at", null);
  if (error) throw error;
}

/** Total unread count for the bell badge. */
export async function fetchUnreadCount(currentUserId: string): Promise<number> {
  const client = createClient();
  const { count, error } = await client
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", currentUserId)
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

/** Fetch the most recent N messages between current user and other user,
 *  oldest first for natural chat rendering. */
export async function fetchThread(
  otherUserId: string,
  currentUserId: string,
  limit = 200,
): Promise<DirectMessage[]> {
  const client = createClient();
  const { data, error } = await client
    .from("direct_messages_with_users")
    .select(COLS)
    .or(
      `and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`,
    )
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DirectMessage[];
}

/** Inbox = one row per conversation, latest message + unread count.
 *  Implemented client-side because Postgres window-function views are
 *  cumbersome to set up, message volume per user is low, so pulling
 *  the recent rows and folding is fine. */
export interface InboxThread {
  other_user_id: string;
  other_name: string;
  other_avatar: string | null;
  last_message: string;
  last_at: string;
  unread: number;
}

export async function fetchInbox(currentUserId: string, limit = 200): Promise<InboxThread[]> {
  const client = createClient();
  const { data, error } = await client
    .from("direct_messages_with_users")
    .select(COLS)
    .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as DirectMessage[];
  const byThread = new Map<string, InboxThread>();
  for (const m of rows) {
    const isMine = m.sender_id === currentUserId;
    const otherId = isMine ? m.recipient_id : m.sender_id;
    const otherName = (isMine ? m.recipient_name : m.sender_name) ?? "Unknown";
    const otherAvatar = (isMine ? m.recipient_avatar : m.sender_avatar) ?? null;
    const existing = byThread.get(otherId);
    if (!existing) {
      byThread.set(otherId, {
        other_user_id: otherId,
        other_name: otherName,
        other_avatar: otherAvatar,
        last_message: m.body,
        last_at: m.created_at,
        unread: !isMine && !m.read_at ? 1 : 0,
      });
    } else if (!isMine && !m.read_at) {
      existing.unread += 1;
    }
  }
  return Array.from(byThread.values()).sort(
    (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime(),
  );
}
