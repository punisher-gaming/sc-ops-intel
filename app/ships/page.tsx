import { PageShell } from "@/components/PageShell";
import { CatalogStub } from "@/components/CatalogStub";

export default function ShipsPage() {
  return (
    <PageShell>
      <CatalogStub
        title="SHIPS"
        blurb="Every flyable hull in the 'verse — manufacturer, role, size class, hull HP, shield HP, speed, cargo capacity, crew requirements. Filter and compare."
      />
    </PageShell>
  );
}
