"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { MapBrowser } from "@/components/MapBrowser";

export default function MapPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="container-wide" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
            Loading map…
          </div>
        }
      >
        <MapBrowser />
      </Suspense>
    </PageShell>
  );
}
