import { createClient } from "./supabase/client";

const NOTIFY_URL = "https://sc-ops-intel-ingest.clint-150.workers.dev/notify/discord";

/**
 * Get the user's stored Discord webhook URL from their profile.
 * Returns null if they haven't set one up yet.
 */
export async function fetchUserWebhook(userId: string): Promise<string | null> {
  const client = createClient();
  const { data, error } = await client
    .from("profiles")
    .select("discord_webhook_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return ((data as { discord_webhook_url?: string | null } | null)?.discord_webhook_url) ?? null;
}

/**
 * Save (or clear) the user's Discord webhook URL on their profile.
 * Empty string clears it; the DB constraint validates the format.
 */
export async function saveUserWebhook(userId: string, url: string): Promise<void> {
  const client = createClient();
  const value = url.trim() || null;
  const { error } = await client
    .from("profiles")
    .update({ discord_webhook_url: value })
    .eq("id", userId);
  if (error) throw error;
}

/**
 * POST a message to a Discord webhook via the worker's CORS-bypass relay.
 * Returns true on success; false on any failure (we deliberately swallow
 * errors so a failed notification never breaks a mark-sold action).
 */
export async function postDiscordNotice(opts: {
  webhookUrl: string;
  content: string;
  username?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(NOTIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        webhook_url: opts.webhookUrl,
        content: opts.content,
        username: opts.username ?? "CitizenDex Auction",
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return Boolean(body.ok);
  } catch {
    return false;
  }
}

/**
 * Convenience: fetch the seller's webhook (if any) and post a message
 * to it. Used by the auction listing detail page when the owner marks
 * sold or a buyer expresses interest. No-op if seller hasn't wired up
 * a webhook.
 */
export async function notifyUser(userId: string, content: string): Promise<boolean> {
  const url = await fetchUserWebhook(userId);
  if (!url) return false;
  return postDiscordNotice({ webhookUrl: url, content });
}
