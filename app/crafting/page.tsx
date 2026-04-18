"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { CraftingBrowser } from "@/components/CraftingBrowser";

export default function CraftingPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="container-wide" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
            Loading recipes…
          </div>
        }
      >
        <CraftingBrowser />
      </Suspense>
    </PageShell>
  );
}
