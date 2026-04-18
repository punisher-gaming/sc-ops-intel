import { PageShell } from "@/components/PageShell";
import { CatalogStub } from "@/components/CatalogStub";

export default function CommoditiesPage() {
  return (
    <PageShell>
      <CatalogStub
        title="COMMODITIES"
        blurb="Tradable goods across the 'verse — buy/sell prices per terminal, live-tracked. Route planner and profit calculator landing in Phase 3."
      />
    </PageShell>
  );
}
