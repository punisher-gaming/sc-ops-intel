"use client";

// Two-pane inbox. Left = conversation list. Right = thread with the
// person currently selected (?with=<userId>) plus a composer.

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { useUser } from "@/lib/supabase/hooks";
import { fetchUserWebhook } from "@/lib/notify";
import {
  fetchInbox,
  fetchThread,
  markThreadRead,
  sendMessage,
  type DirectMessage,
  type InboxThread,
} from "@/lib/messages";

export default function InboxPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="container" style={{ padding: "3rem 1rem" }}>Loading…</div>}>
        <Inbox />
      </Suspense>
    </PageShell>
  );
}

function Inbox() {
  const router = useRouter();
  const params = useSearchParams();
  const otherId = params.get("with") ?? "";
  const { user, loading } = useUser();
  const [threads, setThreads] = useState<InboxThread[] | null>(null);
  const [thread, setThread] = useState<DirectMessage[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastPushNote, setLastPushNote] = useState<string | null>(null);
  // Does the current user have Discord notifications wired up? If not,
  // we surface a one-line nag so they know to enable it for live pushes.
  const [hasWebhook, setHasWebhook] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user) return;
    fetchUserWebhook(user.id).then((url) => setHasWebhook(!!url));
  }, [user]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent("/inbox")}`);
    }
  }, [loading, user, router]);

  // Load conversation list
  useEffect(() => {
    if (!user) return;
    fetchInbox(user.id).then(setThreads).catch(() => setThreads([]));
  }, [user]);

  // Load thread for the selected user
  useEffect(() => {
    if (!user || !otherId) {
      setThread(null);
      return;
    }
    fetchThread(otherId, user.id).then((rows) => {
      setThread(rows);
      // Mark unread incoming messages as read, then refresh inbox to
      // clear the unread badge.
      markThreadRead(otherId, user.id)
        .then(() => fetchInbox(user.id).then(setThreads))
        .catch(() => { /* ignore */ });
    });
  }, [user, otherId]);

  // Auto-scroll to newest message
  useEffect(() => {
    if (scrollerRef.current && thread) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [thread]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !otherId || !body.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const senderName =
        user.user_metadata?.user_name ??
        user.user_metadata?.preferred_username ??
        user.email?.split("@")[0];
      const otherThread = threads?.find((t) => t.other_user_id === otherId);
      const link = typeof window !== "undefined" ? window.location.origin + `/inbox?with=${user.id}` : undefined;
      const res = await sendMessage({
        recipient_id: otherId,
        body: body.trim(),
        sender_name: senderName,
        context_label: otherThread ? `chat with ${otherThread.other_name}` : undefined,
        link,
      });
      setThread((prev) => (prev ? [...prev, res.message] : [res.message]));
      setBody("");
      const channels = [
        res.pushedToDiscord && "Discord",
        res.pushedToEmail && "email",
      ].filter(Boolean);
      setLastPushNote(
        channels.length > 0
          ? `📡 Also notified via ${channels.join(" + ")}`
          : "💤 No outside notifications configured — they'll see this on next visit",
      );
      // Clear the push hint after a moment so it doesn't pile up.
      setTimeout(() => setLastPushNote(null), 6000);
      // Refresh inbox so the latest-message preview updates
      fetchInbox(user.id).then(setThreads);
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "3rem", maxWidth: 1100 }}>
      <div className="page-header">
        <div className="accent-label">Direct messages</div>
        <h1>Inbox</h1>
        <p>
          In-site chat. Messages you send auto-push to the other person&apos;s{" "}
          <strong>email</strong> (default-on) and to their <strong>Discord</strong>{" "}
          if they&apos;ve set up a webhook — so they&apos;ll see it even if
          you&apos;re in different timezones.
        </p>
      </div>

      {hasWebhook === false && (
        <div
          className="card"
          style={{
            padding: "12px 16px",
            marginBottom: 14,
            borderLeft: "3px solid var(--warn)",
            background: "rgba(245,185,71,0.06)",
            fontSize: "0.88rem",
            lineHeight: 1.55,
          }}
        >
          🔔 <strong>Want incoming messages pushed to your Discord?</strong>{" "}
          One-time webhook setup on your{" "}
          <Link href="/account" style={{ color: "var(--accent)" }}>account page</Link>.{" "}
          No server of your own? You can spin up a private one in 30 seconds
          — the walkthrough on the account page covers the whole click path.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "minmax(220px, 320px) 1fr",
          minHeight: 480,
        }}
      >
        {/* Conversation list */}
        <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              fontSize: "0.78rem",
              color: "var(--text-dim)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Conversations
          </div>
          {threads === null && (
            <div style={{ padding: 14, color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading…</div>
          )}
          {threads && threads.length === 0 && (
            <div style={{ padding: 14, color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No conversations yet. Hit the &ldquo;Send in-site message&rdquo; button on any
              auction listing to start one.
            </div>
          )}
          {threads &&
            threads.map((t) => {
              const active = t.other_user_id === otherId;
              return (
                <Link
                  key={t.other_user_id}
                  href={`/inbox?with=${encodeURIComponent(t.other_user_id)}`}
                  style={{
                    display: "block",
                    padding: "10px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    textDecoration: "none",
                    color: "var(--text)",
                    background: active
                      ? "rgba(77,217,255,0.10)"
                      : t.unread > 0
                      ? "rgba(77,217,255,0.04)"
                      : "transparent",
                    borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <strong style={{ fontSize: "0.9rem" }}>{t.other_name}</strong>
                    {t.unread > 0 && (
                      <span className="badge badge-accent" style={{ fontSize: "0.6rem", padding: "1px 6px" }}>
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.last_message}
                  </div>
                  <div style={{ marginTop: 2, fontSize: "0.68rem", color: "var(--text-dim)" }}>
                    {new Date(t.last_at).toLocaleString()}
                  </div>
                </Link>
              );
            })}
        </div>

        {/* Thread + composer */}
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", minHeight: 480 }}>
          {!otherId && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                padding: "2rem",
                textAlign: "center",
              }}
            >
              {threads && threads.length === 0
                ? "No conversations yet."
                : "Pick a conversation on the left."}
            </div>
          )}

          {otherId && (
            <>
              <div
                ref={scrollerRef}
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {thread === null && <div style={{ color: "var(--text-muted)" }}>Loading thread…</div>}
                {thread && thread.length === 0 && (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    No messages in this thread yet — start it off below.
                  </div>
                )}
                {thread &&
                  thread.map((m) => {
                    const mine = user && m.sender_id === user.id;
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: mine ? "flex-end" : "flex-start",
                          maxWidth: "78%",
                          padding: "8px 12px",
                          borderRadius: 10,
                          background: mine ? "rgba(77,217,255,0.10)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${mine ? "rgba(77,217,255,0.25)" : "rgba(255,255,255,0.08)"}`,
                          fontSize: "0.92rem",
                          lineHeight: 1.4,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        <div>{m.body}</div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: "0.62rem",
                            color: "var(--text-dim)",
                            textAlign: mine ? "right" : "left",
                          }}
                        >
                          {new Date(m.created_at).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <form
                onSubmit={send}
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  padding: 12,
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-end",
                }}
              >
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your message…"
                  rows={2}
                  maxLength={4000}
                  className="textarea"
                  style={{ flex: 1, resize: "vertical", minHeight: 56 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      send(e as unknown as React.FormEvent);
                    }
                  }}
                />
                <button type="submit" className="btn btn-primary" disabled={busy || !body.trim()}>
                  {busy ? "Sending…" : "Send"}
                </button>
              </form>
              <div
                style={{
                  margin: "0 12px 12px",
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "rgba(77,217,255,0.04)",
                  border: "1px solid rgba(77,217,255,0.12)",
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                🔒 Your email is private — never shared with anyone you message.
                Replies stay on CitizenDex. Don&apos;t paste personal contact info
                in messages you wouldn&apos;t share publicly.
              </div>

              {err && (
                <div
                  style={{
                    margin: 12,
                    marginTop: 0,
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "rgba(255,107,107,0.08)",
                    border: "1px solid rgba(255,107,107,0.3)",
                    color: "var(--alert)",
                    fontSize: "0.8rem",
                  }}
                >
                  {err}
                </div>
              )}
              {lastPushNote && (
                <div
                  style={{
                    margin: 12,
                    marginTop: 0,
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: "rgba(77,217,255,0.06)",
                    border: "1px solid rgba(77,217,255,0.18)",
                    color: "var(--text-muted)",
                    fontSize: "0.78rem",
                  }}
                >
                  {lastPushNote}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--text-dim)" }}>
        Messages are visible only to you and the recipient. Moderators can review threads
        if a dispute is raised.
      </p>
    </div>
  );
}
