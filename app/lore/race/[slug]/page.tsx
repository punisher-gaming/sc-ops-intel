import Link from "next/link";
import { notFound } from "next/navigation";
import { RACES, getRace } from "@/lib/lore-data";

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

      <header className="lore-detail-header">
        <div className="lore-detail-eyebrow">
          {race.glyph} Sapient Species
        </div>
        <h1 className="lore-detail-title">{race.name}</h1>
        <p className="lore-detail-sub">{race.subtitle}</p>
      </header>

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="lore-stat">
      <div className="lore-stat-label">{label}</div>
      <div className="lore-stat-value">{value}</div>
    </div>
  );
}
