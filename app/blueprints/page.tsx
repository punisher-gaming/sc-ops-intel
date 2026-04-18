import { PageShell } from "@/components/PageShell";
import { CatalogStub } from "@/components/CatalogStub";

export default function BlueprintsPage() {
  return (
    <PageShell>
      <CatalogStub
        title="BLUEPRINTS"
        blurb="Every fabricator blueprint from 4.7 onward — sortable by type, rarity, and source (mission, shop, drop). Click through to the crafting recipe and required materials."
      />
    </PageShell>
  );
}
