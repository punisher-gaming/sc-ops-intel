"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { TradeLocationsBrowser } from "@/components/TradeLocationsBrowser";

export default function TradeLocationsPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="container-wide" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
            Loading trade locations…
          </div>
        }
      >
        <TradeLocationsBrowser />
      </Suspense>
    </PageShell>
  );
}
