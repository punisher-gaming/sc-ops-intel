"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { FleetCompare } from "@/components/FleetCompare";

export default function ShipCompare() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="container-wide" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
            Loading fleet…
          </div>
        }
      >
        <FleetCompare />
      </Suspense>
    </PageShell>
  );
}
