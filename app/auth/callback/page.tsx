"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    // Supabase JS automatically parses the hash/query params and sets the session.
    // Once the session change fires, we bounce the user into the app.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/notes");
      }
    });
    // Safety: if we land here already authed, go straight in.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/notes");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <PageShell>
      <div className="max-w-[500px] mx-auto px-8 text-center">
        <div
          className="font-mono text-phosphor mt-16"
          style={{ fontSize: "1.3rem", letterSpacing: "0.2em" }}
        >
          &gt; authenticating...
        </div>
      </div>
    </PageShell>
  );
}
