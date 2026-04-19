"use client";

// Top-right bell. Polls unread count every 30s; on click, drops a small
// preview menu of the 5 most-recent threads with a link to the full
// /inbox page. Hidden when not logged in.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@/lib/supabase/hooks";
import { fetchInbox, fetchUnreadCount, type InboxThread } from "@/lib/messages";

const POLL_MS = 30_000;

export function NotificationBell() {
  const { user } = useUser();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<InboxThread[] | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Poll unread count
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    async function tick() {
      const n = await fetchUnreadCount(user!.id);
      if (!cancelled) setUnread(n);
    }
    tick();
    const handle = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [user]);

  // Lazy-load preview when opening
  useEffect(() => {
    if (!open || !user || preview !== null) return;
    fetchInbox(user.id, 20).then((rows) => setPreview(rows.slice(0, 5)));
  }, [open, user, preview]);

  // Click-outside close
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          // Force a refresh of the preview next time it opens
          if (open) setPreview(null);
        }}
        aria-label={`Inbox (${unread} unread)`}
        title={unread > 0 ? `${unread} unread message${unread === 1 ? "" : "s"}` : "Inbox"}
        style={{
          position: "relative",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          padding: "6px 8px",
          color: unread > 0 ? "var(--accent)" : "var(--text-muted)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: "1rem",
          lineHeight: 1,
        }}
      >
        <BellIcon />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              padding: "0 5px",
              background: "var(--alert)",
              color: "#fff",
              fontSize: "0.65rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 2px #05070d",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            background: "#0a0e16",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            zIndex: 60,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong style={{ fontSize: "0.9rem" }}>Inbox</strong>
            <Link
              href="/inbox"
              onClick={() => setOpen(false)}
              style={{ fontSize: "0.78rem", color: "var(--accent)" }}
            >
              View all →
            </Link>
          </div>
          {preview === null && (
            <div style={{ padding: 14, color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Loading…
            </div>
          )}
          {preview && preview.length === 0 && (
            <div style={{ padding: 14, color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No messages yet. When someone DMs you about a listing, it shows up here.
            </div>
          )}
          {preview &&
            preview.map((t) => (
              <Link
                key={t.other_user_id}
                href={`/inbox?with=${encodeURIComponent(t.other_user_id)}`}
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  textDecoration: "none",
                  color: "var(--text)",
                  background: t.unread > 0 ? "rgba(77,217,255,0.05)" : "transparent",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <strong style={{ fontSize: "0.88rem" }}>{t.other_name}</strong>
                  {t.unread > 0 && (
                    <span
                      className="badge badge-accent"
                      style={{ fontSize: "0.6rem", minWidth: 0, padding: "1px 6px" }}
                    >
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
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3a6 6 0 0 0-6 6v3.586l-1.707 1.707A1 1 0 0 0 5 16h14a1 1 0 0 0 .707-1.707L18 12.586V9a6 6 0 0 0-6-6Zm-2 17a2 2 0 1 0 4 0h-4Z"
        fill="currentColor"
      />
    </svg>
  );
}
