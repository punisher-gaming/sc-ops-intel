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

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => handleOAuth("google")}
              disabled={busy}
              className="btn btn-secondary"
              style={{ width: "100%", opacity: busy ? 0.5 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              <GoogleGlyph /> Continue with Google
            </button>
            <button
              onClick={() => handleOAuth("discord")}
              disabled={busy}
              className="btn btn-secondary"
              style={{ width: "100%", opacity: busy ? 0.5 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              <DiscordGlyph /> Continue with Discord
            </button>
          </div>

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

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.7 4.8-6.3 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8c1.8-4.4 6-7.5 10.9-7.5 3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5 0-9.3-3.2-10.9-7.7l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C40 35 44 29.8 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

function DiscordGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2" aria-hidden>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.291a.077.077 0 0 1-.006.128 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
