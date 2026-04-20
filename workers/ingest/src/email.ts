// Resend transactional email integration. Used by /notify/user to
// email the recipient when an in-site DM arrives, fallback (or
// supplement) to the Discord webhook path.
//
// We never expose either party's email to the other: the message goes
// FROM our notifications address, the recipient sees only the sender's
// CitizenDex display name. Hitting Reply on the email lands at our
// no-op address; the proper reply path is the inbox link in the body.

import type { Env } from "./supabase";

export interface EmailPayload {
  to: string;
  subject: string;
  /** Plain-text body. We auto-derive an HTML version from this. */
  text: string;
  /** Optional CTA link rendered as a button in the HTML version. */
  link?: string;
  linkLabel?: string;
}

export async function sendEmail(env: Env, payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  if (!env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  const from = env.NOTIFICATIONS_FROM || "CitizenDex <onboarding@resend.dev>";
  // The HTML version embeds the CTA as a button; the text version stays
  // simple (some recipients have HTML disabled).
  const html = renderHtml(payload);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject.slice(0, 200),
        text: payload.text,
        html,
        // Anyone who hits "Reply" lands at noreply@ which we ignore. The
        // CTA in the body is the supported reply path.
        reply_to: env.NOTIFICATIONS_REPLY_TO || "noreply@citizendex.com",
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `resend ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? String(e) };
  }
}

function renderHtml(p: EmailPayload): string {
  // Inline-styled plain HTML, no template engine, no images. Keeps the
  // Resend payload tiny and renders consistently across Gmail / Outlook
  // / Apple Mail without weird artefacts.
  const safe = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const lines = safe(p.text)
    .split("\n")
    .map((l) => `<p style="margin:0 0 12px;line-height:1.55;color:#1f2937;">${l || "&nbsp;"}</p>`)
    .join("");
  const cta = p.link
    ? `<a href="${safe(p.link)}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">${safe(p.linkLabel || "Open on CitizenDex →")}</a>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;border:1px solid #e5e7eb;">
      <tr><td>
        <div style="font-size:13px;letter-spacing:0.18em;color:#0ea5e9;text-transform:uppercase;margin-bottom:8px;">CITIZENDEX</div>
        ${lines}
        ${cta}
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">
          This message was sent on behalf of another CitizenDex user.
          <strong>Your email address is private</strong> and was never shared with them , 
          replies happen on the site.<br>
          <a href="https://citizendex.com/account" style="color:#0ea5e9;">Manage notification settings</a>
        </p>
      </td></tr>
    </table>
  </body></html>`;
}
