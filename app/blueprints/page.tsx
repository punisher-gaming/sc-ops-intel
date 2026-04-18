"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { BlueprintsBrowser } from "@/components/BlueprintsBrowser";

export default function BlueprintsPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="container-wide" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
            Loading blueprints…
          </div>
        }
      >
        <BlueprintsBrowser />
      </Suspense>
    </PageShell>
  );
}
