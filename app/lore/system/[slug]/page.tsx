import Link from "next/link";
import { notFound } from "next/navigation";
import { SYSTEMS, getSystem } from "@/lib/lore-data";
import { PlanetOrbit } from "@/components/LoreArt";
import type { Accent } from "@/components/LoreArt";
import { LoreImageEl } from "@/components/LoreImage";

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

      {/* Full-width banner — real system photo preferred, orbital map fallback */}
      <div
        style={{
          position: "relative",
          height: 360,
          marginBottom: 24,
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid var(--card-accent, var(--lore-cyan))",
          background: "#020409",
        }}
      >
        {sys.heroImage ? (
          <LoreImageEl image={sys.heroImage} credit="corner" />
        ) : (
          <PlanetOrbit
            accent={sys.accent as Accent}
            planets={Math.min(Math.max(sys.planets.length, 2), 6)}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        )}
        <div
          style={{
            position: "absolute",
            left: 0, right: 0, bottom: 0,
            padding: "1.5rem 2rem",
            background: "linear-gradient(0deg, rgba(2,5,12,0.92) 0%, transparent 100%)",
          }}
        >
          <div className="lore-detail-eyebrow" style={{ marginBottom: 4 }}>
            {sys.glyph} Star System
          </div>
          <h1 className="lore-detail-title" style={{ margin: 0, fontSize: "clamp(1.6rem, 4vw, 2.8rem)" }}>
            {sys.name}
          </h1>
          <p className="lore-detail-sub" style={{ marginTop: 4 }}>{sys.subtitle}</p>
        </div>
      </div>

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
