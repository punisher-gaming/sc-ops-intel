import { PageShell } from "@/components/PageShell";
import { CatalogStub } from "@/components/CatalogStub";

export default function CraftingPage() {
  return (
    <PageShell>
      <CatalogStub
        title="CRAFTING"
        blurb="Fabricator recipes — blueprint + required resources → output item. Click a material to jump to where to find it in Resources."
      />
    </PageShell>
  );
}
