"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { ShipsBrowser } from "@/components/ShipsBrowser";

export default function ShipsPage() {
  return (
    <PageShell>
      <Suspense fallback={<LoadingState />}>
        <ShipsBrowser />
      </Suspense>
    </PageShell>
  );
}

function LoadingState() {
  return (
    <div className="max-w-[1200px] mx-auto px-8">
      <div className="tron-card font-mono text-phosphor">
        &gt; loading ships database...
      </div>
    </div>
  );
}
