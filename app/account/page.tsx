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
  email_notifications_enabled: boolean | null;
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
  const [emailNotifs, setEmailNotifs] = useState(true);
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
        // Defaults to true if the column hasn't been backfilled — matches
        // the DB default and keeps coverage on by default.
        setEmailNotifs(p?.email_notifications_enabled ?? true);
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
        email_notifications_enabled: emailNotifs,
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

            {/* Email notifications — universal default, ON until the
                user opts out. We use the email tied to your auth account
                and never expose it to anyone you message with. */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 6,
                background: "rgba(77,217,255,0.04)",
                border: "1px solid rgba(77,217,255,0.18)",
              }}
            >
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={emailNotifs}
                  onChange={(e) => setEmailNotifs(e.target.checked)}
                  style={{ accentColor: "var(--accent)", marginTop: 3 }}
                />
                <div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 600 }}>
                    📧 Email me when someone messages me
                  </div>
                  <div style={{ marginTop: 4, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                    Sends a notification to{" "}
                    <strong style={{ color: "var(--text)" }}>{user.email ?? "your account email"}</strong>{" "}
                    whenever a buyer pings one of your listings or a citizen
                    DMs you. <strong>Your email is never shared</strong> with
                    the other party — they only see your CitizenDex display
                    name.
                  </div>
                </div>
              </label>
            </div>

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
              <div
                style={{
                  marginTop: 10,
                  padding: "12px 14px",
                  borderRadius: 6,
                  background: "rgba(245,185,71,0.06)",
                  border: "1px solid rgba(245,185,71,0.25)",
                  color: "var(--text-muted)",
                  fontSize: "0.82rem",
                  lineHeight: 1.55,
                }}
              >
                <strong style={{ color: "var(--warn)" }}>
                  &ldquo;I don&apos;t have a Discord server I control&rdquo;
                </strong>{" "}
                — no problem. Discord&apos;s API blocks external services from
                DMing users directly (anti-spam), but you can spin up a private
                server <em>just for yourself</em> in literally 30 seconds. It
                stays empty except for your own bot pings — most power-users
                already have one. See the walkthrough below for the click path.
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
                  🔔 How Discord notifications work — full walkthrough
                </summary>
                <div style={{ marginTop: 12 }}>
                  <p style={{ margin: "0 0 10px" }}>
                    <strong>The short version:</strong> you give us a URL that
                    points at one of your Discord channels. When something
                    happens — a buyer pings you, an in-site DM arrives, a
                    listing sells — we POST a message into that channel. No
                    bot, no permissions on your account, no Discord login.
                  </p>

                  <p style={{ margin: "0 0 10px", fontWeight: 600, color: "var(--text)" }}>
                    Step 1 — Make sure you have a server (skip if you do):
                  </p>
                  <ol style={{ margin: "0 0 12px", paddingLeft: "1.2rem" }}>
                    <li>In Discord&apos;s left sidebar, click the green <strong>+</strong> button under your server list (&quot;Add a Server&quot;).</li>
                    <li>Pick <strong>Create My Own</strong> → <strong>For me and my friends</strong>.</li>
                    <li>Name it anything — &quot;<em>My Notifications</em>&quot; or &quot;<em>Bot Spam</em>&quot; is what most people pick. Skip the icon, hit <strong>Create</strong>.</li>
                    <li>You now have a private server with one channel (<code>#general</code>) that only you can see. That&apos;s your DM-replacement.</li>
                  </ol>

                  <p style={{ margin: "0 0 10px", fontWeight: 600, color: "var(--text)" }}>
                    Step 2 — Make a webhook in that channel:
                  </p>
                  <ol style={{ margin: "0 0 12px", paddingLeft: "1.2rem" }}>
                    <li>Right-click the channel (<code>#general</code> is fine) → <strong>Edit Channel</strong> → <strong>Integrations</strong> → <strong>Webhooks</strong> → <strong>New Webhook</strong>.</li>
                    <li>Optionally rename it &quot;CitizenDex&quot; and pick an avatar. Click <strong>Copy Webhook URL</strong>.</li>
                    <li>Paste the URL into the field above and click <strong>Test</strong>. A test message appears in your channel in &lt;1 second.</li>
                    <li>Hit <strong>Save</strong> at the bottom of this form. Done — Discord will go &quot;ping!&quot; on your phone every time something happens to your listings.</li>
                  </ol>

                  <p style={{ margin: "0 0 10px", fontWeight: 600, color: "var(--text)" }}>
                    What gets sent (and when):
                  </p>
                  <ul style={{ margin: "0 0 12px", paddingLeft: "1.2rem" }}>
                    <li>
                      <strong>💬 In-site direct messages</strong> — when
                      another citizen DMs you on CitizenDex, the body of
                      their message appears in your Discord channel with a
                      link back to your inbox.
                    </li>
                    <li>
                      <strong>🛒 Buyer / seller interest</strong> — when
                      someone clicks &quot;🔔 Quick Discord ping&quot; on
                      one of your auction listings, we forward their handle
                      plus the listing link.
                    </li>
                    <li>
                      <strong>🤝 Listing sold / filled</strong> — when you
                      mark your own listing SOLD/FILLED, we send a reminder
                      ping with the counterparty handle so you don&apos;t lose
                      track of who to find in-game.
                    </li>
                  </ul>

                  <p style={{ margin: "0 0 10px", fontWeight: 600, color: "var(--text)" }}>
                    Why not just DM me directly?
                  </p>
                  <p style={{ margin: "0 0 10px" }}>
                    Discord&apos;s policy: external services can&apos;t initiate
                    DMs to users without going through a Discord <em>bot</em>
                    that you&apos;ve installed and accepted DMs from. We&apos;d
                    have to ship a CitizenDex bot, get it added to a server
                    you&apos;re already in, and ask you to opt in — much heavier
                    than the 60-second webhook path above. The personal server
                    trick gets you the same outcome (Discord notifies you on
                    all your devices instantly) without any of that overhead.
                  </p>

                  <p style={{ margin: "0 0 10px", fontWeight: 600, color: "var(--text)" }}>
                    Privacy &amp; safety:
                  </p>
                  <ul style={{ margin: "0 0 0", paddingLeft: "1.2rem" }}>
                    <li>The webhook URL is a <em>per-channel write token</em> — anyone holding it can post to that channel. Don&apos;t paste it into other sites you don&apos;t trust.</li>
                    <li>Revoke it any time from Discord (delete the webhook). Next CitizenDex notification silently fails and we just stop sending.</li>
                    <li>We never @-everyone or @-here. Discord&apos;s allowed_mentions block strips that out before forwarding.</li>
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
