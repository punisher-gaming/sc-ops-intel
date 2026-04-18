import { PageShell } from "@/components/PageShell";
import { CatalogStub } from "@/components/CatalogStub";

export default function ComponentsPage() {
  return (
    <PageShell>
      <CatalogStub
        title="COMPONENTS"
        blurb="Shields, power plants, coolers, quantum drives, scanners — ship-system modules with their ratings, grades, and which hulls they fit."
      />
    </PageShell>
  );
}
