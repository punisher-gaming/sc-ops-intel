import Link from "next/link";
import { notFound } from "next/navigation";
import { RACES, getRace } from "@/lib/lore-data";
import { RacePortrait } from "@/components/LoreArt";
import { LoreImageEl } from "@/components/LoreImage";

export function generateStaticParams() {
  return RACES.map((r) => ({ slug: r.slug }));
}
export const dynamicParams = false;

export default async function RaceDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const race = getRace(slug);
  if (!race) notFound();

  return (
    <div className={`lore-detail accent-${race.accent}`}>
      <Link href="/lore/races" className="lore-detail-back">
        ← All species
      </Link>

      {/* Dossier-style header: portrait left, metadata right */}
      <header
        className="lore-detail-header"
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: "2rem",
          alignItems: "center",
        }}
      >
        <div
          style={{
            border: "1px solid var(--card-accent, var(--lore-cyan))",
            borderRadius: 4,
            overflow: "hidden",
            background: "#020409",
            position: "relative",
            aspectRatio: "3 / 4",
          }}
        >
          {race.heroImage ? (
            <LoreImageEl image={race.heroImage} credit="corner" />
          ) : (
            <RacePortrait
              race={race.slug as "human" | "xian" | "banu" | "vanduul" | "tevarin"}
            />
          )}
        </div>
        <div>
          <div className="lore-detail-eyebrow">
            {race.glyph} Species Dossier
          </div>
          <h1 className="lore-detail-title">{race.name}</h1>
          <p className="lore-detail-sub">{race.subtitle}</p>
        </div>
      </header>

      <style>{mobilePortraitFix}</style>

      <div className="lore-detail-stats">
        <Stat label="Relationship" value={race.relationship} />
        <Stat label="Home World" value={race.homeworld} />
        <Stat label="Home System" value={race.homeSystem} />
        <Stat label="Population" value={race.population} />
        {race.firstContact && (
          <Stat label="First Contact" value={`${race.firstContact} UEE`} />
        )}
      </div>

      <div className="lore-detail-body">
        <p style={{ fontSize: "1.15rem", color: "var(--lore-cyan)", fontStyle: "italic" }}>
          {race.blurb}
        </p>
        {race.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}

        <h3>Culture</h3>
        <p>{race.culture}</p>

        <h3>Notable</h3>
        <ul className="lore-notable-list">
          {race.notable.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Single-column stack on mobile — the portrait is a square card that
// eats the whole row instead of a tight left column.
const mobilePortraitFix = `
@media (max-width: 760px) {
  .lore-detail-header {
    grid-template-columns: 1fr !important;
  }
}
`;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="lore-stat">
      <div className="lore-stat-label">{label}</div>
      <div className="lore-stat-value">{value}</div>
    </div>
  );
}
