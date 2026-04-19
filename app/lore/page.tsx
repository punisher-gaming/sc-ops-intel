import Link from "next/link";
import { CHAPTERS, RACES, SYSTEMS } from "@/lib/lore-data";

// Lore landing page — hero + chapter grid + species teaser + systems teaser.
// Rendered as a server component (no client JS needed) so it statically
// exports cleanly and loads fast on first visit.

export default function LoreHome() {
  return (
    <>
      <section className="lore-hero">
        <div className="lore-hero-eyebrow">◢ The Chronicle</div>
        <h1 className="lore-hero-title">The Verse</h1>
        <div className="lore-hero-sub">2075 — 2952 · UEE Calendar</div>
        <p className="lore-hero-body">
          A thousand years of Human history in the stars. The first fusion
          reactor, the first jump point, the empires that rose, the
          civilizations we found already waiting for us — and the enemies
          who found us first. Scroll through the eras in order, or skip to
          the species and systems you want to know.
        </p>
      </section>

      <section>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
          <SectionHead eyebrow="◢ Chronicle" title="Eras" />
        </div>
        <div className="lore-chapter-grid">
          {CHAPTERS.map((c) => (
            <Link
              key={c.slug}
              href={`/lore/chapter/${c.slug}`}
              className="lore-chapter-card"
            >
              <span className="lore-chapter-card-glyph" aria-hidden>{c.glyph}</span>
              <div className="lore-chapter-card-num">Chapter {c.num}</div>
              <h2 className="lore-chapter-card-title">{c.title}</h2>
              <div className="lore-chapter-card-sub">{c.subtitle}</div>
              <div className="lore-chapter-card-years">
                {c.yearsFrom} — {c.yearsTo}
              </div>
              <p className="lore-chapter-card-blurb">{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "4rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
          <SectionHead eyebrow="◢ Sapient Species" title="Who's Out There" />
          <p style={{ color: "var(--lore-text-dim)", maxWidth: "56ch", lineHeight: 1.7, marginBottom: 8 }}>
            Five species with names. Unknown more without. Every first
            contact changes the map.
          </p>
        </div>
        <div className="lore-species-grid">
          {RACES.map((r) => (
            <Link
              key={r.slug}
              href={`/lore/race/${r.slug}`}
              className={`lore-species-card accent-${r.accent}`}
            >
              <div className="lore-card-glyph" aria-hidden>{r.glyph}</div>
              <div className="lore-card-name">{r.name}</div>
              <div className="lore-card-sub">{r.subtitle}</div>
              <div className="lore-card-meta">
                {r.relationship} · Home: {r.homeSystem}
              </div>
              <p className="lore-card-blurb">{r.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "4rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
          <SectionHead eyebrow="◢ Star Systems" title="Known Space" />
          <p style={{ color: "var(--lore-text-dim)", maxWidth: "56ch", lineHeight: 1.7, marginBottom: 8 }}>
            The systems the UEE has charted, sold, protected, or abandoned.
          </p>
        </div>
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
      </section>
    </>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.72rem",
          letterSpacing: "0.3em",
          color: "var(--lore-cyan)",
          textTransform: "uppercase",
          marginBottom: 8,
          textShadow: "0 0 12px rgba(77,217,255,0.4)",
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "2rem",
          fontWeight: 800,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          margin: 0,
          color: "var(--lore-text)",
        }}
      >
        {title}
      </h2>
    </div>
  );
}
