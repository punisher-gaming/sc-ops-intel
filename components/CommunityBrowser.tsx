"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  castVote,
  createReply,
  createThread,
  fetchAllThreads,
  fetchAuthors,
  fetchMyVotes,
  fetchReplies,
  fetchThread,
  formatRelative,
  setThreadFlags,
  softDeleteReply,
  type Author,
  type Reply,
  type SortMode,
  type Thread,
} from "@/lib/chat";
import { useUser } from "@/lib/supabase/hooks";
import { createClient } from "@/lib/supabase/client";

// All threads (topics) in one feed. Sorted hot/new/top. Schema still has
// chat_categories under the hood — we silently slot every new topic into
// 'general' so users don't have to pick.
const DEFAULT_CATEGORY = "general";

export function CommunityBrowser() {
  const params = useSearchParams();
  const thread = params.get("thread") ?? "";
  if (thread) return <ThreadView threadId={thread} />;
  return <TopicFeed />;
}

// ============================================================================
// Topic feed — all threads, bumped by activity
// ============================================================================

function TopicFeed() {
  const { user } = useUser();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [authors, setAuthors] = useState<Map<string, Author>>(new Map());
  const [myVotes, setMyVotes] = useState<Map<string, -1 | 1>>(new Map());
  const [sort, setSort] = useState<SortMode>("hot");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function reload() {
    try {
      const ts = await fetchAllThreads(sort);
      setThreads(ts);
      setLoaded(true);
      const auths = await fetchAuthors(ts.map((t) => t.user_id));
      setAuthors(auths);
      if (user) {
        const v = await fetchMyVotes(user.id, "thread", ts.map((t) => t.id));
        setMyVotes(v);
      } else {
        setMyVotes(new Map());
      }
    } catch (e) {
      setErr((e as Error).message ?? String(e));
      setLoaded(true);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, user?.id]);

  return (
    <div className="container-wide" style={{ paddingTop: "2.5rem", maxWidth: 1000 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="accent-label">Community</div>
          <h1>Topics</h1>
          <p>
            Anyone can start a topic. Active topics rise to the top — every
            new reply or vote bumps it.
          </p>
        </div>
        <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {(["hot", "new", "top"] as SortMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSort(m)}
              className={sort === m ? "btn btn-primary" : "btn btn-ghost"}
              style={{ height: 30, padding: "0 12px", fontSize: "0.8rem", textTransform: "capitalize" }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* New topic CTA */}
      {user ? (
        <div style={{ marginBottom: 16 }}>
          {!showForm ? (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + New topic
            </button>
          ) : (
            <NewTopicForm
              userId={user.id}
              busy={busy}
              setBusy={setBusy}
              onCancel={() => setShowForm(false)}
              onCreated={() => {
                setShowForm(false);
                reload();
              }}
            />
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: 16, color: "var(--text-muted)" }}>
          <Link href="/login" style={{ color: "var(--accent)" }}>Sign in</Link> to start a topic or vote.
        </div>
      )}

      {err && <ErrorBar text={err} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {threads.map((t) => (
          <ThreadCard
            key={t.id}
            thread={t}
            author={authors.get(t.user_id)}
            myVote={myVotes.get(t.id)}
            user={user}
            onVote={async (val) => {
              if (!user) return;
              const current = myVotes.get(t.id);
              const next: -1 | 0 | 1 = current === val ? 0 : val;
              await castVote(user.id, "thread", t.id, next);
              reload();
            }}
          />
        ))}
        {loaded && threads.length === 0 && !err && (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-dim)" }}>
            No topics yet — be the first to start one.
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadCard({
  thread,
  author,
  myVote,
  user,
  onVote,
}: {
  thread: Thread;
  author?: Author;
  myVote: -1 | 1 | undefined;
  user: ReturnType<typeof useUser>["user"];
  onVote: (val: -1 | 1) => void;
}) {
  return (
    <div
      className="card"
      style={{
        padding: "1rem 1.25rem",
        display: "grid",
        gridTemplateColumns: "44px 1fr",
        gap: 14,
        alignItems: "start",
      }}
    >
      <VoteColumn score={thread.score} myVote={myVote} disabled={!user} onVote={onVote} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {thread.pinned && <span className="badge badge-warn" style={{ fontSize: "0.65rem" }}>📌 Pinned</span>}
          {thread.locked && <span className="badge badge-muted" style={{ fontSize: "0.65rem" }}>🔒 Locked</span>}
          <Link
            href={`/community?thread=${encodeURIComponent(thread.id)}`}
            style={{ color: "var(--accent)", fontWeight: 600, fontSize: "1rem" }}
          >
            {thread.title}
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
          <AuthorPill author={author} />
          <span className="label-mini">{formatRelative(thread.created_at)}</span>
          <span className="label-mini">· {thread.reply_count} repl{thread.reply_count === 1 ? "y" : "ies"}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Thread detail view
// ============================================================================

function ThreadView({ threadId }: { threadId: string }) {
  const { user } = useUser();
  const [thread, setThread] = useState<Thread | null | undefined>(undefined);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [authors, setAuthors] = useState<Map<string, Author>>(new Map());
  const [myThreadVote, setMyThreadVote] = useState<-1 | 1 | undefined>(undefined);
  const [myReplyVotes, setMyReplyVotes] = useState<Map<string, -1 | 1>>(new Map());
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isModerator, setIsModerator] = useState(false);

  async function reload() {
    try {
      const [t, rs] = await Promise.all([fetchThread(threadId), fetchReplies(threadId)]);
      setThread(t);
      setReplies(rs);
      const uids = [t?.user_id, ...rs.map((r) => r.user_id)].filter((u): u is string => !!u);
      const auths = await fetchAuthors(uids);
      setAuthors(auths);
      if (user) {
        const [tv, rv] = await Promise.all([
          fetchMyVotes(user.id, "thread", t ? [t.id] : []),
          fetchMyVotes(user.id, "reply", rs.map((r) => r.id)),
        ]);
        setMyThreadVote(t ? tv.get(t.id) : undefined);
        setMyReplyVotes(rv);
      }
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, user?.id]);

  useEffect(() => {
    if (!user) {
      setIsModerator(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("is_moderator")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsModerator(Boolean((data as { is_moderator?: boolean } | null)?.is_moderator)));
  }, [user]);

  if (thread === undefined)
    return <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>Loading…</div>;
  if (thread === null)
    return (
      <div className="container" style={{ paddingTop: "3rem" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ color: "var(--alert)", marginBottom: 10 }}>Topic not found.</div>
          <Link href="/community" style={{ color: "var(--accent)" }}>← Back to topics</Link>
        </div>
      </div>
    );

  async function voteThread(val: -1 | 1) {
    if (!user) return;
    if (!thread) return;
    const next: -1 | 0 | 1 = myThreadVote === val ? 0 : val;
    await castVote(user.id, "thread", thread.id, next);
    reload();
  }

  async function voteReply(rid: string, val: -1 | 1) {
    if (!user) return;
    const current = myReplyVotes.get(rid);
    const next: -1 | 0 | 1 = current === val ? 0 : val;
    await castVote(user.id, "reply", rid, next);
    reload();
  }

  async function postReply(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !body.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await createReply({ thread_id: threadId, user_id: user.id, body: body.trim() });
      setBody("");
      reload();
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-wide" style={{ paddingTop: "1.5rem", maxWidth: 900 }}>
      <Link href="/community" className="label-mini" style={{ color: "var(--accent)" }}>
        ← All topics
      </Link>

      {/* Thread post */}
      <div className="card" style={{ padding: "1.5rem", marginTop: "1.5rem", display: "grid", gridTemplateColumns: "48px 1fr", gap: 16 }}>
        <VoteColumn
          score={thread.score}
          myVote={myThreadVote}
          disabled={!user}
          onVote={voteThread}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            {thread.pinned && <span className="badge badge-warn" style={{ fontSize: "0.65rem" }}>📌 Pinned</span>}
            {thread.locked && <span className="badge badge-muted" style={{ fontSize: "0.65rem" }}>🔒 Locked</span>}
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.3 }}>{thread.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <AuthorPill author={authors.get(thread.user_id)} />
            <span className="label-mini">{formatRelative(thread.created_at)}</span>
          </div>
          <div style={{ marginTop: 14, color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {thread.body}
          </div>
          {isModerator && <ModBar thread={thread} onAction={reload} />}
        </div>
      </div>

      {/* Reply composer */}
      {user && !thread.locked && (
        <form onSubmit={postReply} style={{ marginTop: 16 }}>
          <div className="card" style={{ padding: "1rem 1.25rem" }}>
            <div className="label-mini" style={{ marginBottom: 6 }}>Reply</div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={4}
              maxLength={4000}
              placeholder="Write a reply…"
              className="textarea"
            />
            {err && <div style={{ marginTop: 8, color: "var(--alert)", fontSize: "0.85rem" }}>{err}</div>}
            <div style={{ marginTop: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={busy || !body.trim()}>
                {busy ? "Posting…" : "Post reply"}
              </button>
            </div>
          </div>
        </form>
      )}
      {!user && (
        <div className="card" style={{ padding: "1rem 1.25rem", marginTop: 16, color: "var(--text-muted)" }}>
          <Link href="/login" style={{ color: "var(--accent)" }}>Sign in</Link> to reply or vote.
        </div>
      )}
      {user && thread.locked && (
        <div className="card" style={{ padding: "1rem 1.25rem", marginTop: 16, color: "var(--text-muted)" }}>
          🔒 This thread is locked. New replies disabled.
        </div>
      )}

      {/* Replies */}
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="accent-label">{replies.length} repl{replies.length === 1 ? "y" : "ies"}</div>
        {replies.map((r) => (
          <div
            key={r.id}
            className="card"
            style={{
              padding: "1rem 1.25rem",
              display: "grid",
              gridTemplateColumns: "44px 1fr",
              gap: 14,
            }}
          >
            <VoteColumn score={r.score} myVote={myReplyVotes.get(r.id)} disabled={!user} onVote={(v) => voteReply(r.id, v)} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <AuthorPill author={authors.get(r.user_id)} />
                <span className="label-mini">{formatRelative(r.created_at)}</span>
              </div>
              <div style={{ color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{r.body}</div>
              {isModerator && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Delete this reply?")) return;
                    await softDeleteReply(r.id);
                    reload();
                  }}
                  className="btn btn-ghost"
                  style={{ height: 26, padding: "0 8px", fontSize: "0.75rem", color: "var(--alert)", marginTop: 8 }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function VoteColumn({
  score,
  myVote,
  disabled,
  onVote,
}: {
  score: number;
  myVote: -1 | 1 | undefined;
  disabled: boolean;
  onVote: (val: -1 | 1) => void;
}) {
  const upActive = myVote === 1;
  const downActive = myVote === -1;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote(1)}
        aria-label="Upvote"
        title={disabled ? "Sign in to vote" : "Upvote"}
        style={{
          width: 28,
          height: 24,
          padding: 0,
          background: "transparent",
          border: "none",
          color: upActive ? "var(--success)" : "var(--text-dim)",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "1rem",
        }}
      >
        ▲
      </button>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.85rem",
          color: upActive ? "var(--success)" : downActive ? "var(--alert)" : "var(--text-muted)",
          minWidth: 24,
          textAlign: "center",
        }}
      >
        {score}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote(-1)}
        aria-label="Downvote"
        title={disabled ? "Sign in to vote" : "Downvote"}
        style={{
          width: 28,
          height: 24,
          padding: 0,
          background: "transparent",
          border: "none",
          color: downActive ? "var(--alert)" : "var(--text-dim)",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "1rem",
        }}
      >
        ▼
      </button>
    </div>
  );
}

function AuthorPill({ author }: { author?: Author }) {
  if (!author) {
    return <span className="label-mini">unknown</span>;
  }
  const name = author.display_name ?? "user";
  // Wraps the whole pill in a Link to the public profile page so any
  // community comment is one click away from the user's fleets/intel.
  return (
    <Link
      href={`/profile?id=${encodeURIComponent(author.id)}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", textDecoration: "none", color: "inherit" }}
      title={`View ${name}'s profile`}
    >
      {author.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={author.avatar_url}
          alt=""
          width={20}
          height={20}
          style={{ borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", objectFit: "cover" }}
        />
      ) : (
        <span
          aria-hidden
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "rgba(77,217,255,0.08)",
            border: "1px solid rgba(77,217,255,0.25)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            fontWeight: 700,
            fontSize: "0.7rem",
          }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span style={{ color: "var(--text)", fontWeight: 500 }}>{name}</span>
      {author.is_admin && <span className="badge badge-accent" style={{ fontSize: "0.6rem" }}>admin</span>}
      {author.is_moderator && !author.is_admin && (
        <span className="badge badge-success" style={{ fontSize: "0.6rem" }}>mod</span>
      )}
    </Link>
  );
}

function ModBar({ thread, onAction }: { thread: Thread; onAction: () => void }) {
  return (
    <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={async () => {
          await setThreadFlags(thread.id, { pinned: !thread.pinned });
          onAction();
        }}
        className="btn btn-ghost"
        style={{ height: 26, padding: "0 10px", fontSize: "0.75rem" }}
      >
        {thread.pinned ? "Unpin" : "📌 Pin"}
      </button>
      <button
        type="button"
        onClick={async () => {
          await setThreadFlags(thread.id, { locked: !thread.locked });
          onAction();
        }}
        className="btn btn-ghost"
        style={{ height: 26, padding: "0 10px", fontSize: "0.75rem" }}
      >
        {thread.locked ? "Unlock" : "🔒 Lock"}
      </button>
      <button
        type="button"
        onClick={async () => {
          if (!confirm("Delete this topic?")) return;
          await setThreadFlags(thread.id, { deleted: true });
          onAction();
        }}
        className="btn btn-ghost"
        style={{ height: 26, padding: "0 10px", fontSize: "0.75rem", color: "var(--alert)" }}
      >
        Delete
      </button>
    </div>
  );
}

function NewTopicForm({
  userId,
  busy,
  setBusy,
  onCancel,
  onCreated,
}: {
  userId: string;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await createThread({
        category_id: DEFAULT_CATEGORY,
        user_id: userId,
        title: title.trim(),
        body: body.trim(),
      });
      onCreated();
    } catch (e) {
      setErr((e as Error).message ?? String(e));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        maxLength={200}
        placeholder="Topic title"
        className="input"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        maxLength={8000}
        rows={6}
        placeholder="What's on your mind?"
        className="textarea"
      />
      {err && <div style={{ color: "var(--alert)", fontSize: "0.85rem" }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={busy || !title.trim() || !body.trim()}>
          {busy ? "Posting…" : "Post topic"}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ErrorBar({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 6,
        background: "rgba(255,107,107,0.08)",
        border: "1px solid rgba(255,107,107,0.3)",
        color: "var(--alert)",
        marginBottom: 16,
      }}
    >
      {text}
    </div>
  );
}
