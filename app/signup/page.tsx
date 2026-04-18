"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    if (data.session) {
      router.push("/notes");
    } else {
      setMessage("Check your email for a confirmation link.");
      setBusy(false);
    }
  }

  async function handleDiscord() {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
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
          Create account
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 8, marginBottom: 24, lineHeight: 1.6 }}>
          Free. Only needed to save notes, recipes, and log intel. We store
          your email and nothing else unless you opt in.
        </p>

        <div className="card" style={{ padding: "1.75rem" }}>
          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
              <div className="label-mini" style={{ marginBottom: 6 }}>Password (8+ chars)</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
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
            {message && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 6,
                  background: "rgba(74,222,128,0.08)",
                  border: "1px solid rgba(74,222,128,0.3)",
                  color: "var(--success)",
                  fontSize: "0.85rem",
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary"
              style={{ marginTop: 4, opacity: busy ? 0.5 : 1 }}
            >
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <div className="label-mini">or</div>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>

          <button
            onClick={handleDiscord}
            disabled={busy}
            className="btn btn-secondary"
            style={{ width: "100%", opacity: busy ? 0.5 : 1 }}
          >
            Continue with Discord
          </button>

          <div style={{ marginTop: 20, fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--accent)" }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
