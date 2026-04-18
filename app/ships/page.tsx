import { PageShell } from "@/components/PageShell";
import { CatalogStub } from "@/components/CatalogStub";

export default function ShipsPage() {
  return (
    <PageShell>
      <CatalogStub
        title="SHIPS"
        blurb="Every flyable hull in the 'verse — coming after blueprints, resources, and crafting ship. Ingest is already live (295 hulls in the DB); UI re-enables once the higher-priority sections land."
      />
    </PageShell>
  );
}
