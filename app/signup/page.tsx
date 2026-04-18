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
      <div className="max-w-[500px] mx-auto px-8">
        <div className="divider">
          <div className="bar" />
          <div className="label">CREATE ACCOUNT</div>
          <div className="bar" />
        </div>
        <div className="tron-card mt-8">
          <p className="text-bone/70 mb-6">
            Free. Only needed to save notes and recipes. We store your email and nothing else
            unless you opt in.
          </p>
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="px-4 py-3 font-mono text-lg bg-transparent border border-cyan/30 text-bone placeholder:text-bone/30 focus:border-cyan outline-none"
            />
            <input
              type="password"
              placeholder="password (8+ chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="px-4 py-3 font-mono text-lg bg-transparent border border-cyan/30 text-bone placeholder:text-bone/30 focus:border-cyan outline-none"
            />
            {error && (
              <div className="font-mono text-sm p-3 border border-[#FF3B30]/50 text-[#FF3B30]" style={{ letterSpacing: "0.08em" }}>
                {error}
              </div>
            )}
            {message && (
              <div className="font-mono text-sm p-3 border border-phosphor/50 text-phosphor" style={{ letterSpacing: "0.08em" }}>
                {message}
              </div>
            )}
            <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-50 disabled:cursor-wait">
              {busy ? "..." : "Sign Up"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-cyan/20" />
            <div className="font-mono text-bone/40 text-sm" style={{ letterSpacing: "0.2em" }}>OR</div>
            <div className="flex-1 h-px bg-cyan/20" />
          </div>

          <button onClick={handleDiscord} disabled={busy} className="btn btn-secondary w-full disabled:opacity-50">
            Continue with Discord
          </button>

          <div className="mt-6 text-bone/60 text-sm font-mono" style={{ letterSpacing: "0.1em" }}>
            Already have an account?{" "}
            <Link href="/login" className="text-cyan hover:text-magenta">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
