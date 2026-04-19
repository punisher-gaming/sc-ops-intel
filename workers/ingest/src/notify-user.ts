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
import { sendEmail } from "./email";

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

  // Look up recipient's webhook + email-notifications preference.
  const client = supabase(env);
  const { data: profile, error: profileErr } = await client
    .from("profiles")
    .select("discord_webhook_url, email_notifications_enabled")
    .eq("id", recipientId)
    .maybeSingle();
  if (profileErr) {
    return Response.json({ ok: false, error: profileErr.message }, { status: 500, headers: CORS });
  }
  const prof = (profile ?? {}) as {
    discord_webhook_url?: string | null;
    email_notifications_enabled?: boolean | null;
  };
  const webhookUrl = prof.discord_webhook_url;
  // Email defaults ON if the column doesn't exist yet on this row (legacy
  // accounts without the migration applied to them).
  const emailEnabled = prof.email_notifications_enabled !== false;

  const sender = (body.sender_name ?? "A CitizenDex user").slice(0, 60);
  const ctx = body.context_label ? ` (re: ${body.context_label.slice(0, 80)})` : "";

  // ── Discord push (if webhook configured) ──
  let discordPushed = false;
  if (webhookUrl && ALLOWED_HOST.test(webhookUrl)) {
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
      discordPushed = res.ok;
    } catch {
      /* swallow — email path may still succeed */
    }
  }

  // ── Email push (if enabled and Resend configured) ──
  let emailPushed = false;
  if (emailEnabled && env.RESEND_API_KEY) {
    // Look up the recipient's auth.users email via service-role.
    const { data: authData, error: authErr } =
      await client.auth.admin.getUserById(recipientId);
    const email = !authErr ? authData?.user?.email ?? null : null;
    if (email) {
      const subject = `${sender} messaged you on CitizenDex${ctx}`;
      const text =
        `${sender} sent you a message on CitizenDex${ctx}:\n\n` +
        `"${message}"\n\n` +
        `Reply on the site — your email is private and was never shared.`;
      const res = await sendEmail(env, {
        to: email,
        subject,
        text,
        link: body.link ?? "https://citizendex.com/inbox",
        linkLabel: "Reply on CitizenDex →",
      });
      emailPushed = res.ok;
    }
  }

  return Response.json(
    {
      ok: true,
      pushed: discordPushed,           // back-compat alias
      pushedToDiscord: discordPushed,
      pushedToEmail: emailPushed,
    },
    { headers: CORS },
  );
}
