"use client";

// "Send message" button + compose modal. Used wherever a user might
// want to DM another user (auction listings, profile pages). Modal is
// inline rather than a portal so it stays self-contained, no globals
// needed. Inserts into direct_messages and best-effort pushes to the
// recipient's Discord webhook via the worker proxy.

import { useState } from "react";
import Link from "next/link";
import { sendMessage } from "@/lib/messages";
import { useUser } from "@/lib/supabase/hooks";

interface Props {
  recipientId: string;
  recipientName: string;
  /** Optional listing context, sets context_listing_id and surfaces in
   *  the Discord push so the recipient knows which listing the DM is
   *  about. */
  contextListingId?: string;
  contextLabel?: string;
  /** Page URL to deep-link back to from Discord. Defaults to current
   *  page if not provided. */
  link?: string;
  /** Visible label on the button. */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function MessageButton({
  recipientId,
  recipientName,
  contextListingId,
  contextLabel,
  link,
  label = "💬 Send in-site message",
  className = "btn btn-secondary",
  style,
}: Props) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pushedDiscord, setPushedDiscord] = useState(false);
  const [pushedEmail, setPushedEmail] = useState(false);
  // Quiet mode, when checked, message lands in their inbox only with
  // no email/Discord push. Default OFF (loud) for first-contact since
  // we want them to actually see it. They can flip it for casual chat.
  const [quiet, setQuiet] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !body.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await sendMessage({
        recipient_id: recipientId,
        body: body.trim(),
        context_listing_id: contextListingId,
        sender_name: user.user_metadata?.user_name ?? user.user_metadata?.preferred_username ?? user.email?.split("@")[0],
        context_label: contextLabel,
        link: link ?? (typeof window !== "undefined" ? window.location.href : undefined),
        notifyExternal: !quiet,
      });
      setSent(true);
      setPushedDiscord(res.pushedToDiscord);
      setPushedEmail(res.pushedToEmail);
      setBody("");
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setSent(false);
    setErr(null);
    setBody("");
  }

  if (!user) {
    return (
      <Link
        href={`/login?next=${typeof window !== "undefined" ? encodeURIComponent(window.location.pathname) : "/"}`}
        className={className}
        style={style}
      >
        {label} (log in first)
      </Link>
    );
  }

  if (user.id === recipientId) {
    // Don't show a "message yourself" button on your own listing.
    return null;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} style={style}>
        {label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              width: "100%",
              maxWidth: 480,
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div className="accent-label">In-site message</div>
            <h3 style={{ margin: 0, fontSize: "1.15rem" }}>
              Message {recipientName}
            </h3>
            {contextLabel && (
              <div className="label-mini" style={{ color: "var(--text-muted)" }}>
                Re: <strong style={{ color: "var(--accent)" }}>{contextLabel}</strong>
              </div>
            )}

            {sent ? (
              <>
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 6,
                    background: "rgba(74,222,128,0.08)",
                    border: "1px solid rgba(74,222,128,0.3)",
                    color: "var(--success)",
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                  }}
                >
                  ✓ Message saved to {recipientName}&apos;s inbox.
                  <br />
                  {(pushedDiscord || pushedEmail) ? (
                    <>
                      📡 <strong>Notified via</strong>{" "}
                      {[pushedDiscord && "Discord", pushedEmail && "email"]
                        .filter(Boolean)
                        .join(" + ")}{" "}
                     , they&apos;ll see it instantly.
                    </>
                  ) : (
                    <>💤 No outside notifications configured, they&apos;ll see it when they next visit CitizenDex.</>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => setSent(false)} className="btn btn-secondary">
                    Send another
                  </button>
                  <button type="button" onClick={close} className="btn btn-ghost">
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={`Hey ${recipientName.split(" ")[0]}, interested in your listing. When are you next in-game?`}
                  rows={5}
                  maxLength={4000}
                  required
                  autoFocus
                  className="textarea"
                />

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={quiet}
                    onChange={(e) => setQuiet(e.target.checked)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  🔕 <strong>Quiet send</strong>, inbox only, no email or
                  Discord ping
                </label>

                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "rgba(77,217,255,0.05)",
                    border: "1px solid rgba(77,217,255,0.15)",
                    fontSize: "0.76rem",
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  🔒 <strong>Your email stays private.</strong> {recipientName}{" "}
                  will see your CitizenDex display name and the message text , 
                  never your email address. Don&apos;t paste personal contact
                  info you wouldn&apos;t normally share.
                </div>

                {err && (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 6,
                      background: "rgba(255,107,107,0.08)",
                      border: "1px solid rgba(255,107,107,0.3)",
                      color: "var(--alert)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {err}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" onClick={close} className="btn btn-ghost" disabled={busy}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={busy || !body.trim()}>
                    {busy ? "Sending…" : "Send message"}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
