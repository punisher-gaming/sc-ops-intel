import { PageShell } from "@/components/PageShell";
import { CatalogStub } from "@/components/CatalogStub";

export default function WeaponsPage() {
  return (
    <PageShell>
      <CatalogStub
        title="WEAPONS"
        blurb="Ship-mounted and personal weapons — damage, range, fire rate, ammo, heat, distortion, and the ship hardpoints / FPS slots they fit."
      />
    </PageShell>
  );
}
