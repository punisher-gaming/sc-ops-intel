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
  const [message, setMessage] = useState<string | null>(null);

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
    setMessage(error ? `Error: ${error.message}` : "Saved.");
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
        <div className="max-w-[900px] mx-auto px-8 text-center mt-16">
          <div className="font-mono text-bone/60" style={{ letterSpacing: "0.2em" }}>
            &gt; loading...
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-[900px] mx-auto px-8">
        <div className="divider">
          <div className="bar" />
          <div className="label">ACCOUNT</div>
          <div className="bar" />
        </div>

        <div className="tron-card mt-8">
          <h2 className="font-display font-bold text-2xl mb-4" style={{ letterSpacing: "0.1em" }}>
            PROFILE
          </h2>
          <div className="font-mono text-bone/60 mb-6 text-sm" style={{ letterSpacing: "0.1em" }}>
            SIGNED IN AS :: <span className="text-phosphor">{user.email}</span>
          </div>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-cyan text-sm" style={{ letterSpacing: "0.2em" }}>
                DISPLAY NAME
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What we show other players"
                className="px-4 py-2 font-mono text-lg bg-transparent border border-cyan/30 text-bone placeholder:text-bone/30 focus:border-cyan outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 mt-4">
              <span className="font-mono text-cyan text-sm" style={{ letterSpacing: "0.2em" }}>
                RSI HANDLE (OPTIONAL)
              </span>
              <input
                type="text"
                value={rsiHandle}
                onChange={(e) => setRsiHandle(e.target.value)}
                placeholder="your_rsi_handle"
                className="px-4 py-2 font-mono text-lg bg-transparent border border-cyan/30 text-bone placeholder:text-bone/30 focus:border-cyan outline-none"
              />
              <span className="font-sans text-bone/50 text-sm leading-relaxed">
                If set, we fetch and display your <strong>public</strong> RSI profile — orgs,
                badges, join date. We never request your RSI password.
              </span>
            </label>

            {message && (
              <div
                className="font-mono text-sm p-3 border"
                style={{
                  borderColor: message.startsWith("Error") ? "rgba(255,59,48,0.5)" : "rgba(0,255,127,0.5)",
                  color: message.startsWith("Error") ? "#FF3B30" : "var(--phosphor)",
                  letterSpacing: "0.08em",
                }}
              >
                {message}
              </div>
            )}

            <div>
              <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-50">
                {busy ? "..." : "Save"}
              </button>
            </div>
          </form>
        </div>

        <div className="tron-card mt-8">
          <h2 className="font-display font-bold text-2xl mb-2" style={{ letterSpacing: "0.1em" }}>
            HANGAR
          </h2>
          <p className="text-bone/70 mb-4">
            Import your purchased-ship list from your RSI pledges page. A guided flow lets you
            paste the page HTML and we parse the fleet locally — no credentials leave your
            browser.
          </p>
          <button disabled className="btn btn-disabled">
            Import Hangar :: COMING SOON
          </button>
        </div>

        <div className="tron-card mt-8">
          <h2 className="font-display font-bold text-2xl mb-4" style={{ letterSpacing: "0.1em" }}>
            SESSION
          </h2>
          <button onClick={handleSignOut} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </div>
    </PageShell>
  );
}
