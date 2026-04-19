import Link from "next/link";
import { SYSTEMS } from "@/lib/lore-data";

export default function SystemsIndex() {
  return (
    <>
      <section className="lore-hero" style={{ minHeight: "40vh" }}>
        <div className="lore-hero-eyebrow">◢ Star Systems</div>
        <h1 className="lore-hero-title">Known Space</h1>
        <p className="lore-hero-body">
          The systems the UEE has charted, sold, protected, or abandoned.
          Hundreds more are mapped. Thousands more wait at the end of jump
          points nobody has tried yet.
        </p>
      </section>
      <div className="lore-system-grid">
        {SYSTEMS.map((s) => (
          <Link
            key={s.slug}
            href={`/lore/system/${s.slug}`}
            className={`lore-system-card accent-${s.accent}`}
          >
            <div className="lore-card-glyph" aria-hidden>{s.glyph}</div>
            <div className="lore-card-name">{s.name}</div>
            <div className="lore-card-sub">{s.subtitle}</div>
            <div className="lore-card-meta">
              {s.kind} · {s.jumpPoints} jump points · {s.planets.length} worlds
            </div>
            <p className="lore-card-blurb">{s.blurb}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
