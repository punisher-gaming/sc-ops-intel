"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { ShipsBrowser } from "@/components/ShipsBrowser";

export default function ShipsPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="container-wide" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
            Loading ships…
          </div>
        }
      >
        <ShipsBrowser />
      </Suspense>
    </PageShell>
  );
}
