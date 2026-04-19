"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { SavedFleets } from "@/components/SavedFleets";
import { FleetImport } from "@/components/FleetImport";
import { useUser } from "@/lib/supabase/hooks";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  display_name: string | null;
  rsi_handle: string | null;
  bio: string | null;
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
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [busy, setBusy] = useState(false);
  // Bump this key to force SavedFleets to re-fetch after a successful import
  const [fleetsKey, setFleetsKey] = useState(0);
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
      })
      .eq("id", user.id);
    setBusy(false);
    setMessage(error ? { kind: "error", text: error.message } : { kind: "ok", text: "Saved." });
    setTimeout(() => setMessage(null), 3000);
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
