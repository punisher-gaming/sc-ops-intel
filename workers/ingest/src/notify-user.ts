// In-site DM → recipient's Discord webhook bridge.
//
// The frontend can't read another user's webhook URL (RLS forbids it),
// so it POSTs to this endpoint with just the recipient_id and message.
// We use the service-role key to look up the webhook and forward to
// Discord. Best-effort — the in-site message is already saved, this is
// just a notification on top.
//
// Privacy: the webhook URL is never returned to the caller. We only
// resolve and forward.

import { supabase, type Env } from "./supabase";

const ALLOWED_HOST = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9_\-]+/;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export async function handleNotifyUser(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response("POST only", { status: 405, headers: CORS });
  }
  let body: {
    recipient_id?: string;
    sender_name?: string;
    body?: string;
    context_label?: string | null;
    link?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid JSON" }, { status: 400, headers: CORS });
  }
  const recipientId = (body.recipient_id ?? "").trim();
  const message = (body.body ?? "").trim();
  if (!recipientId || !message) {
    return Response.json(
      { ok: false, error: "recipient_id and body required" },
      { status: 400, headers: CORS },
    );
  }

  // Look up recipient's webhook with service-role key.
  const client = supabase(env);
  const { data, error } = await client
    .from("profiles")
    .select("discord_webhook_url")
    .eq("id", recipientId)
    .maybeSingle();
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500, headers: CORS });
  }
  const webhookUrl = (data as { discord_webhook_url?: string | null } | null)?.discord_webhook_url;
  if (!webhookUrl) {
    // Recipient hasn't wired up notifications. Not an error — message is
    // still in their inbox, so the caller can ignore.
    return Response.json({ ok: true, pushed: false }, { headers: CORS });
  }
  if (!ALLOWED_HOST.test(webhookUrl)) {
    return Response.json(
      { ok: false, error: "stored webhook URL is not a Discord webhook" },
      { status: 500, headers: CORS },
    );
  }

  const sender = (body.sender_name ?? "A CitizenDex user").slice(0, 60);
  const ctx = body.context_label ? ` (re: ${body.context_label.slice(0, 80)})` : "";
  const link = body.link ? `\n${body.link}` : "";
  const content =
    `💬 **${sender}** sent you a message${ctx} on CitizenDex:\n` +
    "```\n" +
    message.slice(0, 1500) +
    "\n```" +
    link;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "CitizenDex Messages",
        content,
        allowed_mentions: { parse: [] },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return Response.json(
        { ok: false, error: `discord ${res.status}: ${text.slice(0, 200)}` },
        { status: 502, headers: CORS },
      );
    }
    return Response.json({ ok: true, pushed: true }, { headers: CORS });
  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error).message ?? String(e) },
      { status: 502, headers: CORS },
    );
  }
}
