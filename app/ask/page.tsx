"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";

// /ask kept as a client-side redirect to /ai for anyone with a bookmark
// or outbound link still pointing at the old URL. Preserves ?q= so an
// in-progress search survives the rename.
function Redirect() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const q = params.get("q");
    const dest = q ? `/ai?q=${encodeURIComponent(q)}` : "/ai";
    router.replace(dest);
  }, [router, params]);
  return null;
}

export default function AskRedirect() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div
            className="container"
            style={{ paddingTop: "3rem", color: "var(--text-muted)" }}
          >
            Taking you to AI…
          </div>
        }
      >
        <Redirect />
      </Suspense>
    </PageShell>
  );
}
