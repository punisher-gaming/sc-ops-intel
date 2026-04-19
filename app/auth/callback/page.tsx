"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { createClient } from "@/lib/supabase/client";

// OAuth callback landing. Order of operations is carefully defensive
// because mobile Safari + Discord's in-app browser both have storage
// quirks that make the PKCE round-trip flaky:
//
// 1. Give the Supabase client's detectSessionInUrl a tick to run (it
//    auto-exchanges the ?code= on page load and beats us to the punch
//    about half the time). If we call exchangeCodeForSession AFTER it
//    already consumed the verifier, we get the scary "PKCE code
//    verifier not found in storage" error even though sign-in actually
//    worked.
// 2. Poll for a session. If one is already set, we're done — bounce.
// 3. If not, call exchangeCodeForSession explicitly as a fallback.
//    Check session again afterward.
// 4. If STILL no session, subscribe to onAuthStateChange for up to 5s.
//    Some mobile browsers need the tab to regain focus before the
//    token ships into storage.
// 5. Only after all that do we show an error — and the message is
//    human, never the raw Supabase exception. Users get a retry CTA
//    instead of wall-of-text.

const FRIENDLY_GENERIC = "Sign-in didn't complete. Please try again.";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "failed" | "blocked">("working");
  const [statusText, setStatusText] = useState("Finishing sign-in…");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let authSub: { unsubscribe: () => void } | null = null;

    async function waitForSession(timeoutMs: number): Promise<boolean> {
      // Fast path — already signed in?
      const { data: { session: s0 } } = await supabase.auth.getSession();
      if (s0) return true;
      // Slow path — wait for the SIGNED_IN event
      return new Promise<boolean>((resolve) => {
        const t = setTimeout(() => {
          authSub?.unsubscribe();
          resolve(false);
        }, timeoutMs);
        const { data } = supabase.auth.onAuthStateChange((event, s) => {
          if (event === "SIGNED_IN" && s) {
            clearTimeout(t);
            data.subscription.unsubscribe();
            resolve(true);
          }
        });
        authSub = data.subscription;
      });
    }

    (async () => {
      try {
        // Step 1: let the client's built-in detectSessionInUrl run first.
        // 50ms is more than enough for the parse + storage write on a
        // cold page load.
        await new Promise((r) => setTimeout(r, 60));
        if (cancelled) return;

        // Step 2: is there already a session? (happens often on desktop
        // where auto-detect wins the race)
        const { data: { session: pre } } = await supabase.auth.getSession();
        if (pre) {
          finish();
          return;
        }

        // Step 3: explicit PKCE exchange as a fallback. Swallow errors
        // here because they commonly mean "already exchanged" — we
        // re-check session below and don't surface the raw message.
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(code);
          } catch (e) {
            // If the trigger-based Discord block fires, bail immediately
            // to /access-denied.
            const msg = (e as Error).message ?? "";
            if (/BLOCKED_DISCORD_USER|blocked_discord_ids/i.test(msg)) {
              setStatus("blocked");
              router.replace("/access-denied");
              return;
            }
            // Otherwise fall through to the session-waiting loop — the
            // auto-detection may have already consumed the verifier.
          }
        }

        // Step 4: poll for a session for up to 5 seconds.
        const ok = await waitForSession(5000);
        if (cancelled) return;
        if (ok) {
          finish();
          return;
        }

        // Step 5: give up gracefully. No raw error message surfaced.
        setStatus("failed");
        setStatusText(FRIENDLY_GENERIC);
      } catch (e) {
        if (cancelled) return;
        const msg = (e as Error).message ?? String(e);
        if (/BLOCKED_DISCORD_USER|blocked_discord_ids/i.test(msg)) {
          router.replace("/access-denied");
          return;
        }
        // Last-ditch: one more session peek in case we got here by race
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          finish();
          return;
        }
        setStatus("failed");
        setStatusText(FRIENDLY_GENERIC);
      }
    })();

    function finish() {
      // Strip ?code= off the URL so a back-navigation doesn't retrigger
      window.history.replaceState({}, "", "/auth/callback");
      router.replace("/notes");
    }

    return () => {
      cancelled = true;
      authSub?.unsubscribe();
    };
  }, [router]);

  return (
    <PageShell>
      <div className="container" style={{ paddingTop: "4rem", textAlign: "center" }}>
        {status === "working" && (
          <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            {statusText}
          </div>
        )}
        {status === "failed" && (
          <div className="card" style={{ maxWidth: 440, margin: "0 auto", padding: "1.5rem", textAlign: "left" }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 6 }}>
              Sign-in didn&apos;t complete
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: 14 }}>
              This sometimes happens on mobile browsers (iPad Safari especially)
              when the OAuth round-trip gets interrupted. Just try again — it
              almost always works on the second try.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/login" className="btn btn-primary">
                Try again
              </Link>
              <Link href="/" className="btn btn-ghost">
                Back to home
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
