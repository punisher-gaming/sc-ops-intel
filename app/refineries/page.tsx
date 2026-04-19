"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { RefineriesBrowser } from "@/components/RefineriesBrowser";

export default function RefineriesPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="container-wide" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
            Loading refineries…
          </div>
        }
      >
        <RefineriesBrowser />
      </Suspense>
    </PageShell>
  );
}
