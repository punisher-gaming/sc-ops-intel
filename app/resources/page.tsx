"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { ResourcesBrowser } from "@/components/ResourcesBrowser";

export default function ResourcesPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="container-wide" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
            Loading resources…
          </div>
        }
      >
        <ResourcesBrowser />
      </Suspense>
    </PageShell>
  );
}
