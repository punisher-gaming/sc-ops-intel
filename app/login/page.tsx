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
          <div className="label">LOG IN</div>
          <div className="bar" />
        </div>
        <div className="tron-card mt-8">
          <p className="text-bone/70 mb-6">
            Logging in is optional. Only needed to save notes, recipes, and your RSI handle.
          </p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="px-4 py-3 font-mono text-lg bg-transparent border border-cyan/30 text-bone placeholder:text-bone/30 focus:border-cyan outline-none"
            />
            {error && (
              <div className="font-mono text-sm p-3 border border-[#FF3B30]/50 text-[#FF3B30]" style={{ letterSpacing: "0.08em" }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-50 disabled:cursor-wait">
              {busy ? "..." : "Sign In"}
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
            No account?{" "}
            <Link href="/signup" className="text-cyan hover:text-magenta">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
