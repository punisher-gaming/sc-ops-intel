"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { CommunityBrowser } from "@/components/CommunityBrowser";

export default function CommunityPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
            Loading…
          </div>
        }
      >
        <CommunityBrowser />
      </Suspense>
    </PageShell>
  );
}
