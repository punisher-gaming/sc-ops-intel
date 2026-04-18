"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push("/notes");
  }

  async function handleOAuth(provider: "discord" | "google") {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "3rem 2rem" }}>
        <div className="accent-label" style={{ marginBottom: 8 }}>Account</div>
        <h1 style={{ fontSize: "2rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
          Sign in
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 8, marginBottom: 24, lineHeight: 1.6 }}>
          Sign-in is optional. Only needed to save notes, link your RSI handle,
          and log field intel.
        </p>

        <div className="card" style={{ padding: "1.75rem" }}>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label>
              <div className="label-mini" style={{ marginBottom: 6 }}>Email</div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input"
              />
            </label>
            <label>
              <div className="label-mini" style={{ marginBottom: 6 }}>Password</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input"
              />
            </label>

            {error && (
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
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary"
              style={{ marginTop: 4, opacity: busy ? 0.5 : 1 }}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <div className="label-mini">or</div>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => handleOAuth("discord")}
              disabled={busy}
              className="btn btn-secondary"
              style={{ width: "100%", opacity: busy ? 0.5 : 1 }}
            >
              Continue with Discord
            </button>
            <button
              onClick={() => handleOAuth("google")}
              disabled={busy}
              className="btn btn-secondary"
              style={{ width: "100%", opacity: busy ? 0.5 : 1 }}
            >
              Continue with Google
            </button>
          </div>

          <div style={{ marginTop: 20, fontSize: "0.875rem", color: "var(--text-muted)" }}>
            No account?{" "}
            <Link href="/signup" style={{ color: "var(--accent)" }}>
              Create one
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
