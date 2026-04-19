import Link from "next/link";
import { CHAPTERS, RACES, SYSTEMS } from "@/lib/lore-data";
import {
  EarthScene,
  JumpPoint,
  PlanetOrbit,
  RacePortrait,
  SpaceScene,
} from "@/components/LoreArt";
import type { Accent } from "@/components/LoreArt";

// Lore landing — cinematic cover, then scroll into the chapter grid,
// species roster, and systems list. Every card is visual.

export default function LoreHome() {
  return (
    <>
      {/* ── Cover ── */}
      <section className="lore-chapter-hero" style={{ minHeight: "80vh" }}>
        <div className="lore-chapter-hero-art">
          <EarthScene />
        </div>
        <div className="lore-chapter-hero-overlay" />
        <div className="lore-chapter-hero-content">
          <div className="lore-hero-eyebrow">◢ The Chronicle · Volume I</div>
          <h1 className="lore-hero-title">The Verse</h1>
          <div className="lore-hero-sub">2075 — 2952 · UEE Calendar</div>
          <p className="lore-hero-body">
            A thousand years of human history in the stars. The first fusion
            reactor, the first jump point, the empires that rose, the
            civilizations we found already waiting for us — and the enemies
            who found us first. Read every era, every species, every system.
          </p>
        </div>
      </section>

      {/* ── Chapter index — each card with splash art ── */}
      <section style={{ marginTop: "3rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
          <SectionHead eyebrow="◢ Chronicle" title="Eras" />
        </div>
        <div
          className="lore-chapter-grid"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}
        >
          {CHAPTERS.map((c) => (
            <Link
              key={c.slug}
              href={`/lore/chapter/${c.slug}`}
              className="lore-chapter-card"
              style={{ padding: 0, overflow: "hidden" }}
            >
              {/* Art header */}
              <div style={{ height: 160, position: "relative", borderBottom: "1px solid var(--lore-border)" }}>
                <ChapterArt slug={c.slug} />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, transparent 40%, rgba(2,5,12,0.85) 100%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 10, left: 12,
                    padding: "2px 10px",
                    background: "rgba(2,5,12,0.75)",
                    border: "1px solid var(--lore-border-strong)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.68rem",
                    letterSpacing: "0.25em",
                    color: "var(--lore-cyan)",
                    textTransform: "uppercase",
                  }}
                >
                  Chapter {c.num}
                </div>
              </div>
              <div style={{ padding: "1.5rem 1.5rem 1.25rem", position: "relative" }}>
                <span className="lore-chapter-card-glyph" aria-hidden style={{ top: -4, right: 12 }}>{c.glyph}</span>
                <h2 className="lore-chapter-card-title">{c.title}</h2>
                <div className="lore-chapter-card-sub">{c.subtitle}</div>
                <div className="lore-chapter-card-years" style={{ marginTop: 8 }}>
                  {c.yearsFrom} — {c.yearsTo}
                </div>
                <p className="lore-chapter-card-blurb" style={{ marginTop: 10 }}>{c.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Species — each card with a tinted portrait ── */}
      <section style={{ marginTop: "4rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
          <SectionHead eyebrow="◢ Sapient Species" title="Who's Out There" />
          <p style={{ color: "var(--lore-text-dim)", maxWidth: "56ch", lineHeight: 1.7, marginBottom: 8 }}>
            Five species with names. Unknown more without.
          </p>
        </div>
        <div
          className="lore-species-grid"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
        >
          {RACES.map((r) => (
            <Link
              key={r.slug}
              href={`/lore/race/${r.slug}`}
              className={`lore-species-card accent-${r.accent}`}
              style={{ padding: 0, overflow: "hidden" }}
            >
              <div
                style={{
                  height: 220,
                  borderBottom: "1px solid var(--lore-border)",
                  background: "#020409",
                }}
              >
                <RacePortrait
                  race={r.slug as "human" | "xian" | "banu" | "vanduul" | "tevarin"}
                  style={{ width: "100%", height: "100%", display: "block" }}
                />
              </div>
              <div style={{ padding: "1.25rem 1.25rem 1rem" }}>
                <div className="lore-card-name">{r.name}</div>
                <div className="lore-card-sub">{r.subtitle}</div>
                <div className="lore-card-meta" style={{ marginTop: 4 }}>
                  {r.relationship} · {r.homeSystem}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Systems — orbital maps ── */}
      <section style={{ marginTop: "4rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
          <SectionHead eyebrow="◢ Star Systems" title="Known Space" />
          <p style={{ color: "var(--lore-text-dim)", maxWidth: "56ch", lineHeight: 1.7, marginBottom: 8 }}>
            The systems the UEE has charted, sold, protected, or abandoned.
          </p>
        </div>
        <div
          className="lore-system-grid"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
        >
          {SYSTEMS.map((s) => (
            <Link
              key={s.slug}
              href={`/lore/system/${s.slug}`}
              className={`lore-system-card accent-${s.accent}`}
              style={{ padding: 0, overflow: "hidden" }}
            >
              <div
                style={{
                  height: 160,
                  borderBottom: "1px solid var(--lore-border)",
                  background: "#020409",
                  position: "relative",
                }}
              >
                <PlanetOrbit
                  accent={s.accent as Accent}
                  planets={Math.min(Math.max(s.planets.length, 2), 6)}
                  style={{ width: "100%", height: "100%", display: "block" }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 10, left: 12,
                    padding: "2px 10px",
                    background: "rgba(2,5,12,0.75)",
                    border: "1px solid var(--lore-border)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.68rem",
                    letterSpacing: "0.2em",
                    color: "var(--card-accent, var(--lore-cyan))",
                    textTransform: "uppercase",
                  }}
                >
                  {s.kind}
                </div>
              </div>
              <div style={{ padding: "1.25rem 1.25rem 1rem" }}>
                <div className="lore-card-name">{s.name}</div>
                <div className="lore-card-sub">{s.subtitle}</div>
                <div className="lore-card-meta" style={{ marginTop: 4 }}>
                  {s.jumpPoints} jumps · {s.planets.length} worlds
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

// Art selector for chapter thumbnails — deterministic per slug.
function ChapterArt({ slug }: { slug: string }) {
  switch (slug) {
    case "origins":       return <EarthScene />;
    case "early-empire":  return <SpaceScene accent="violet" seed={3} />;
    case "messer-era":    return <SpaceScene accent="red" seed={5} />;
    case "liberation":    return <SpaceScene accent="green" seed={7} />;
    case "golden-age":    return <SpaceScene accent="amber" seed={9} />;
    case "current-era":   return <JumpPoint accent="cyan" />;
    default:              return <SpaceScene />;
  }
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
