"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { SavedFleets } from "@/components/SavedFleets";
import { FleetImport } from "@/components/FleetImport";
import { useUser } from "@/lib/supabase/hooks";
import { createClient } from "@/lib/supabase/client";
import { fetchUnreadCount } from "@/lib/messages";

type Profile = {
  id: string;
  display_name: string | null;
  rsi_handle: string | null;
  bio: string | null;
  discord_webhook_url: string | null;
};

function oauthProvider(user: { app_metadata?: Record<string, unknown> } | null): string | null {
  if (!user) return null;
  const prov = (user.app_metadata?.provider as string | undefined) ?? null;
  if (!prov || prov === "email") return null;
  return prov.charAt(0).toUpperCase() + prov.slice(1);
}

function metaString(user: { user_metadata?: Record<string, unknown> } | null, keys: string[]): string | null {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  for (const k of keys) {
    const v = meta[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

export default function AccountPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [displayName, setDisplayName] = useState("");
  const [rsiHandle, setRsiHandle] = useState("");
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [busy, setBusy] = useState(false);
  // Bump this key to force SavedFleets to re-fetch after a successful import
  const [fleetsKey, setFleetsKey] = useState(0);
  // Live unread DM count for the Inbox quick-link badge.
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user) return;
    fetchUnreadCount(user.id).then(setUnread);
  }, [user]);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const p = (data ?? null) as Profile | null;
        // Fall back to OAuth metadata if the profile row is blank.
        // This is common for Discord/Google first-timers — the trigger
        // created a profiles row with just the id, so we pre-fill from
        // the provider's user_metadata so the form isn't empty.
        const metaName = metaString(user, [
          "full_name",
          "name",
          "user_name",
          "preferred_username",
        ]);
        setDisplayName(p?.display_name ?? metaName ?? "");
        setRsiHandle(p?.rsi_handle ?? "");
        setDiscordWebhook(p?.discord_webhook_url ?? "");
        setLoadingProfile(false);
      });
  }, [user, userLoading, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        rsi_handle: rsiHandle.trim() || null,
        discord_webhook_url: discordWebhook.trim() || null,
      })
      .eq("id", user.id);
    setBusy(false);
    setMessage(error ? { kind: "error", text: error.message } : { kind: "ok", text: "Saved." });
    setTimeout(() => setMessage(null), 3000);
  }

  // Send a test message to whatever webhook is currently typed in the
  // input — saved or not. Lets the user verify their channel before
  // committing the URL to their profile.
  async function handleTestWebhook() {
    const url = discordWebhook.trim();
    if (!url) {
      setMessage({ kind: "error", text: "Paste a webhook URL first." });
      return;
    }
    setWebhookTesting(true);
    try {
      const { postDiscordNotice } = await import("@/lib/notify");
      const ok = await postDiscordNotice({
        webhookUrl: url,
        content:
          "✅ CitizenDex test notification — your auction notifications are wired up correctly.",
      });
      setMessage(
        ok
          ? { kind: "ok", text: "Test sent — check your Discord channel." }
          : { kind: "error", text: "Couldn't reach Discord. Double-check the URL." },
      );
    } finally {
      setWebhookTesting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (userLoading || !user || loadingProfile) {
    return (
      <PageShell>
        <div className="container" style={{ paddingTop: "4rem", color: "var(--text-muted)" }}>
          Loading…
        </div>
      </PageShell>
    );
  }

  const avatar = metaString(user, ["avatar_url", "picture"]);
  const providerName = metaString(user, [
    "full_name",
    "name",
    "user_name",
    "preferred_username",
  ]);
  const provider = oauthProvider(user);

  return (
    <PageShell>
      <div className="container" style={{ paddingTop: "2.5rem" }}>
        <div className="page-header">
          <div className="accent-label">Account</div>
          <h1>Your profile</h1>
        </div>

        {/* Quick links to personal-only pages. Notes lives here now
            (used to be top-level nav) since it's private to you. */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          <Link href="/notes" className="btn btn-secondary">
            📝 Your private notes
          </Link>
          <Link
            href="/inbox"
            className="btn btn-secondary"
            style={unread > 0 ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
          >
            💬 Inbox
            {unread > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  minWidth: 20,
                  padding: "0 6px",
                  borderRadius: 10,
                  background: "var(--alert)",
                  color: "#fff",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          <Link href="/community/auction/mine" className="btn btn-secondary">
            ⚖ Your AH listings
          </Link>
        </div>
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--text-dim)",
            marginBottom: "1.5rem",
            lineHeight: 1.55,
          }}
        >
          📝 <strong>Notes</strong> are visible only to you — they don&apos;t
          show up to other citizens or moderators. Pin reminders to ships,
          blueprints, resources, anything.
        </p>

        {/* Identity card — avatar + provider info, pulled from OAuth metadata */}
        <div
          className="card"
          style={{
            padding: "1.25rem 1.5rem",
            marginTop: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              width={56}
              height={56}
              style={{
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.15)",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              aria-hidden
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(77,217,255,0.08)",
                border: "1px solid rgba(77,217,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                fontWeight: 700,
                fontSize: "1.25rem",
              }}
            >
              {(providerName ?? user.email ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
              {providerName ?? user.email ?? "Signed in"}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 2 }}>
              {user.email ?? "No email on file"}
              {provider && (
                <>
                  {" · "}
                  <span style={{ color: "var(--text)" }}>Signed in via {provider}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "1.75rem", marginTop: "1rem" }}>
          <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>Profile</div>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label>
              <div className="label-mini" style={{ marginBottom: 6 }}>Display name</div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What we show other players"
                className="input"
              />
            </label>

            <label>
              <div className="label-mini" style={{ marginBottom: 6 }}>RSI handle (optional)</div>
              <input
                type="text"
                value={rsiHandle}
                onChange={(e) => setRsiHandle(e.target.value)}
                placeholder="your_rsi_handle"
                className="input"
              />
              <div style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginTop: 6, lineHeight: 1.5 }}>
                If set, we fetch your <strong>public</strong> RSI profile — orgs, badges, join
                date. We never request your RSI password.
              </div>
            </label>

            <label>
              <div className="label-mini" style={{ marginBottom: 6 }}>
                Discord webhook URL (optional) — for auction notifications
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="url"
                  value={discordWebhook}
                  onChange={(e) => setDiscordWebhook(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/…"
                  className="input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={webhookTesting || !discordWebhook.trim()}
                  className="btn btn-secondary"
                  style={{ height: 40, padding: "0 14px", fontSize: "0.82rem" }}
                >
                  {webhookTesting ? "Testing…" : "Test"}
                </button>
              </div>
              <details
                style={{
                  marginTop: 10,
                  padding: "12px 14px",
                  borderRadius: 6,
                  background: "rgba(77,217,255,0.05)",
                  border: "1px solid rgba(77,217,255,0.18)",
                  color: "var(--text-muted)",
                  fontSize: "0.82rem",
                  lineHeight: 1.6,
                }}
              >
                <summary
                  style={{ cursor: "pointer", color: "var(--accent)", fontWeight: 500, listStyle: "revert" }}
                >
                  🔔 How Discord notifications work — step-by-step
                </summary>
                <div style={{ marginTop: 12 }}>
                  <p style={{ margin: "0 0 10px" }}>
                    <strong>The short version:</strong> you give us a URL that
                    points at one of your Discord channels. When something
                    happens to your auction listing, we POST a message into
                    that channel. No bot, no permissions on your account, no
                    Discord login required.
                  </p>
                  <p style={{ margin: "0 0 10px", fontWeight: 600, color: "var(--text)" }}>
                    Setup (one minute):
                  </p>
                  <ol style={{ margin: "0 0 12px", paddingLeft: "1.2rem" }}>
                    <li>Open Discord. Pick a channel where you want to receive these pings — making a private <code>#auction-alerts</code> channel that only you can see is the most common choice.</li>
                    <li>Right-click the channel → <strong>Edit Channel</strong> → <strong>Integrations</strong> → <strong>Webhooks</strong> → <strong>New Webhook</strong>.</li>
                    <li>Optionally rename it (e.g. &quot;CitizenDex&quot;) and pick an avatar. Then click <strong>Copy Webhook URL</strong>.</li>
                    <li>Paste it into the field above and click <strong>Test</strong>. You&apos;ll see a test message in your channel within a second.</li>
                    <li>Hit <strong>Save</strong> at the bottom of this form. Done.</li>
                  </ol>
                  <p style={{ margin: "0 0 10px", fontWeight: 600, color: "var(--text)" }}>
                    What gets sent (and when):
                  </p>
                  <ul style={{ margin: "0 0 12px", paddingLeft: "1.2rem" }}>
                    <li>
                      <strong>🛒 Buyer interest</strong> — when a logged-in
                      visitor clicks &quot;🔔 Ping seller&quot; on one of your
                      WTS listings (or &quot;Ping buyer&quot; on a WTB listing),
                      we send their Discord handle plus a link to the listing
                      so you can jump in and DM them.
                    </li>
                    <li>
                      <strong>🤝 Listing sold / filled</strong> — when you
                      mark your own listing as SOLD/FILLED, we send a
                      reminder ping with the buyer (or seller) handle plus
                      the meet-up details so you don&apos;t lose track of who
                      to find in-game.
                    </li>
                  </ul>
                  <p style={{ margin: "0 0 10px", fontWeight: 600, color: "var(--text)" }}>
                    Privacy &amp; safety:
                  </p>
                  <ul style={{ margin: "0 0 0", paddingLeft: "1.2rem" }}>
                    <li>The webhook URL is a <em>per-channel write token</em> — anyone holding it can post to that channel. Don&apos;t paste it into other sites you don&apos;t trust.</li>
                    <li>You can revoke it any time from Discord (delete the webhook). The next CitizenDex notification will silently fail and we&apos;ll just stop sending.</li>
                    <li>We never @-everyone or @-here you. Discord&apos;s allowed_mentions block strips that out before forwarding.</li>
                    <li>Webhook calls are CORS-relayed via our worker; your Discord credentials never touch our servers.</li>
                  </ul>
                </div>
              </details>
            </label>

            {message && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 6,
                  fontSize: "0.85rem",
                  background: message.kind === "ok" ? "rgba(74,222,128,0.08)" : "rgba(255,107,107,0.08)",
                  border: `1px solid ${message.kind === "ok" ? "rgba(74,222,128,0.3)" : "rgba(255,107,107,0.3)"}`,
                  color: message.kind === "ok" ? "var(--success)" : "var(--alert)",
                }}
              >
                {message.text}
              </div>
            )}

            <div>
              <button type="submit" disabled={busy} className="btn btn-primary" style={{ opacity: busy ? 0.5 : 1 }}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>

        <SavedFleets key={fleetsKey} userId={user.id} />

        <div style={{ marginTop: "1rem" }}>
          <FleetImport
            userId={user.id}
            onSaved={() => setFleetsKey((k) => k + 1)}
          />
        </div>

        <div className="card" style={{ padding: "1.75rem", marginTop: "1rem" }}>
          <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>Session</div>
          <button onClick={handleSignOut} className="btn btn-secondary">
            Sign out
          </button>
        </div>
      </div>
    </PageShell>
  );
}
