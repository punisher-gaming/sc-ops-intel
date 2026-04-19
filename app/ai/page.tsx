"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { AskBrowser } from "@/components/AskBrowser";

export default function AskPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
            Loading…
          </div>
        }
      >
        <AskBrowser />
      </Suspense>
    </PageShell>
  );
}
