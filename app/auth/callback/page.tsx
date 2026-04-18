"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("Finishing sign-in…");

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      try {
        // PKCE flow: Supabase redirects back with ?code=... in the URL.
        // We exchange the code for a session client-side, then bounce into
        // the app. Older implicit flow leaves the token in the URL hash
        // instead — detectSessionInUrl in the client handles that case.
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // Either the exchange set the session, or we were already signed in
        // (e.g. opened this URL with an existing session). Either way, check.
        const {
          data: { session },
          error: sessErr,
        } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;

        if (session) {
          // Clean the ?code=... off the URL before leaving
          window.history.replaceState({}, "", "/auth/callback");
          router.replace("/notes");
          return;
        }

        // Subscribe in case onAuthStateChange fires slightly after getSession
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, s) => {
          if (event === "SIGNED_IN" && s) {
            subscription.unsubscribe();
            router.replace("/notes");
          }
        });
        setStatus("Waiting for session…");
        // Auto-give-up after 5s
        setTimeout(() => {
          subscription.unsubscribe();
          setStatus("Sign-in didn't complete. Try again.");
        }, 5000);
      } catch (e) {
        setStatus(
          `Sign-in failed: ${(e as Error).message ?? String(e)}. Try again.`,
        );
      }
    })();
  }, [router]);

  return (
    <PageShell>
      <div
        className="container"
        style={{
          paddingTop: "4rem",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        {status}
      </div>
    </PageShell>
  );
}
