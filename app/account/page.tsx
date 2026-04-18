"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { useUser } from "@/lib/supabase/hooks";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  display_name: string | null;
  rsi_handle: string | null;
  bio: string | null;
};

export default function AccountPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [displayName, setDisplayName] = useState("");
  const [rsiHandle, setRsiHandle] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [busy, setBusy] = useState(false);
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
        if (data) {
          const p = data as Profile;
          setDisplayName(p.display_name ?? "");
          setRsiHandle(p.rsi_handle ?? "");
        }
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

  return (
    <PageShell>
      <div className="container" style={{ paddingTop: "2.5rem" }}>
        <div className="page-header">
          <div className="accent-label">Account</div>
          <h1>Your profile</h1>
          <p>Signed in as <span style={{ color: "var(--text)" }}>{user.email}</span></p>
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

        <div className="card" style={{ padding: "1.75rem", marginTop: "1rem" }}>
          <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8 }}>Hangar</div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 16 }}>
            Import your purchased-ship list from your RSI pledges page. A guided flow will let
            you paste the page HTML and we parse it locally — no credentials leave your browser.
          </p>
          <button disabled className="btn btn-disabled">
            Import Hangar · Coming soon
          </button>
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
