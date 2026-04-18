import { PageShell } from "@/components/PageShell";
import { CatalogStub } from "@/components/CatalogStub";

export default function ResourcesPage() {
  return (
    <PageShell>
      <CatalogStub
        title="RESOURCES"
        blurb="Crafting materials and ores — with location, extraction method (mining, harvesting, mission reward), and which recipes consume them."
      />
    </PageShell>
  );
}
