"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { ItemBrowser } from "@/components/ItemBrowser";

export default function WeaponsPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="container-wide" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
            Loading weapons…
          </div>
        }
      >
        <ItemBrowser
          table="weapons"
          title="Weapons"
          blurb="Ship-mounted and personal weapons. Filter by type, manufacturer, or grade."
        />
      </Suspense>
    </PageShell>
  );
}
