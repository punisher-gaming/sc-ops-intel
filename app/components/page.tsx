"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { ItemBrowser } from "@/components/ItemBrowser";

export default function ComponentsPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="container-wide" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
            Loading components…
          </div>
        }
      >
        <ItemBrowser
          table="components"
          title="Components"
          blurb="Shields, power plants, coolers, quantum drives, scanners, ship-system modules with grades (A–D) and sizes."
          gradeStyle="letter"
        />
      </Suspense>
    </PageShell>
  );
}
