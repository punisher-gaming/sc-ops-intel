// Discord webhook proxy, the frontend can't POST to Discord directly
// (CORS) so this worker route accepts a {webhook_url, payload} body
// and forwards it. We validate the URL is a Discord webhook before
// fanning out to prevent abuse as an open relay.
//
// No auth required, we don't store the URL here, the caller passes it
// each time. The URL itself is a credential (it's a per-channel write
// token), so anyone with it can post anyway. Our job is just CORS.

const ALLOWED_HOST = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9_\-]+/;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export async function handleNotifyDiscord(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response("POST only", { status: 405, headers: CORS });
  }
  let body: {
    webhook_url?: string;
    content?: string;
    username?: string;
    embeds?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid JSON" }, { status: 400, headers: CORS });
  }
  const url = (body.webhook_url ?? "").trim();
  if (!url || !ALLOWED_HOST.test(url)) {
    return Response.json(
      { ok: false, error: "webhook_url must be a Discord webhook URL" },
      { status: 400, headers: CORS },
    );
  }
  const content = (body.content ?? "").slice(0, 1900); // Discord limit 2000
  if (!content && !body.embeds) {
    return Response.json(
      { ok: false, error: "content or embeds required" },
      { status: 400, headers: CORS },
    );
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: body.username?.slice(0, 80) || "CitizenDex",
        content,
        embeds: body.embeds,
        // Suppress @-everyone / @-here just in case a malicious
        // listing description tried to inject a mass ping
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
    return Response.json({ ok: true }, { headers: CORS });
  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error).message ?? String(e) },
      { status: 502, headers: CORS },
    );
  }
}
