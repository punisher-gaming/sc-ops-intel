import Link from "next/link";
import { notFound } from "next/navigation";
import { SYSTEMS, getSystem } from "@/lib/lore-data";

export function generateStaticParams() {
  return SYSTEMS.map((s) => ({ slug: s.slug }));
}
export const dynamicParams = false;

export default async function SystemDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sys = getSystem(slug);
  if (!sys) notFound();

  return (
    <div className={`lore-detail accent-${sys.accent}`}>
      <Link href="/lore/systems" className="lore-detail-back">
        ← All systems
      </Link>

      <header className="lore-detail-header">
        <div className="lore-detail-eyebrow">
          {sys.glyph} Star System
        </div>
        <h1 className="lore-detail-title">{sys.name}</h1>
        <p className="lore-detail-sub">{sys.subtitle}</p>
      </header>

      <div className="lore-detail-stats">
        <Stat label="Classification" value={sys.kind} />
        <Stat label="Star" value={sys.sunType} />
        <Stat label="Jump Points" value={String(sys.jumpPoints)} />
        <Stat label="Charted Worlds" value={String(sys.planets.length)} />
        {sys.firstCharted > 0 && (
          <Stat label="First Charted" value={`${sys.firstCharted} UEE`} />
        )}
      </div>

      <div className="lore-detail-body">
        <p style={{ fontSize: "1.15rem", color: "var(--lore-cyan)", fontStyle: "italic" }}>
          {sys.blurb}
        </p>
        {sys.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}

        <h3>Worlds in System</h3>
        <ul className="lore-notable-list">
          {sys.planets.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>

        <h3>Notable</h3>
        <ul className="lore-notable-list">
          {sys.notable.map((n, i) => (
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
