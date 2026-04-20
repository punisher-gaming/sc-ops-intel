import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CHAPTERS,
  getChapter,
  type LoreArtKey,
  type LoreChapterPanel,
} from "@/lib/lore-data";
import {
  BattleScene,
  CityScene,
  DestructionScene,
  EarthScene,
  JumpPoint,
  PlanetOrbit,
  ShipFighter,
  ShipTrader,
  ShipVanduul,
  SpaceScene,
  UEEInsignia,
  type Accent,
} from "@/components/LoreArt";
import { LoreImageEl } from "@/components/LoreImage";

export function generateStaticParams() {
  return CHAPTERS.map((c) => ({ slug: c.slug }));
}
export const dynamicParams = false;

// ── Art router ───────────────────────────────────────────────────
// Every art-key maps to one of the LoreArt SVG components. Pass
// through the accent from the panel so war scenes go red, discovery
// goes cyan, diplomacy goes violet, commerce goes amber, etc.
function ArtFor({
  kind,
  accent,
}: {
  kind: LoreArtKey;
  accent?: Accent;
}) {
  const a: Accent | undefined = accent;
  switch (kind) {
    case "space":         return <SpaceScene accent={a ?? "cyan"} />;
    case "earth":         return <EarthScene accent={a ?? "cyan"} />;
    case "jump-point":    return <JumpPoint accent={a ?? "cyan"} />;
    case "city":          return <CityScene accent={a ?? "amber"} />;
    case "destruction":   return <DestructionScene accent={a ?? "red"} />;
    case "battle":        return <BattleScene accent={a ?? "red"} />;
    case "planet-orbit":  return <PlanetOrbit accent={a ?? "cyan"} />;
    case "uee-insignia":  return <UEEInsignia accent={a ?? "cyan"} />;
    case "ship-fighter":  return <ShipFighter accent={a ?? "cyan"} />;
    case "ship-vanduul":  return <ShipVanduul accent={a ?? "red"} />;
    case "ship-trader":   return <ShipTrader accent={a ?? "amber"} />;
  }
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapter(slug);
  if (!chapter) notFound();

  const idx = CHAPTERS.findIndex((c) => c.slug === slug);
  const prev = idx > 0 ? CHAPTERS[idx - 1] : null;
  const next = idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;

  return (
    <>
      {/* ── Cinematic chapter cover, real image preferred, SVG fallback ── */}
      <section className="lore-chapter-hero">
        <div className="lore-chapter-hero-art">
          {chapter.heroImage ? (
            <LoreImageEl image={chapter.heroImage} credit="corner" />
          ) : (
            <ArtFor kind={chapter.heroArt} />
          )}
        </div>
        <div className="lore-chapter-hero-overlay" />
        <div className="lore-chapter-hero-content">
          <div className="lore-hero-eyebrow">Chapter {chapter.num}</div>
          <h1 className="lore-hero-title">{chapter.title}</h1>
          <div className="lore-hero-sub">
            {chapter.yearsFrom}, {chapter.yearsTo} · UEE Calendar
          </div>
          <p className="lore-hero-body">{chapter.subtitle}.</p>
        </div>
      </section>

      {/* ── Two-column: sticky timeline + comic stream ── */}
      <div className="lore-chapter-layout">
        <aside className="lore-timeline">
          <div className="lore-timeline-title">◢ Timeline</div>
          {chapter.events.map((e) => (
            <div key={e.year} className="lore-timeline-event">
              <div className="lore-timeline-year">{e.year}</div>
              <div className="lore-timeline-title-inner">{e.title}</div>
              <div className="lore-timeline-body">{e.body}</div>
            </div>
          ))}
        </aside>

        <article className="lore-comic-stream">
          {chapter.panels.map((p, i) => (
            <Panel key={i} panel={p} num={i + 1} />
          ))}
        </article>
      </div>

      {/* ── Chapter-to-chapter nav ── */}
      <nav
        style={{
          maxWidth: 1200,
          margin: "2rem auto 0",
          padding: "0 1.5rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
        aria-label="Chapter navigation"
      >
        {prev ? (
          <Link href={`/lore/chapter/${prev.slug}`} className="lore-chapter-card" style={{ textAlign: "left" }}>
            <div className="lore-chapter-card-num">← Chapter {prev.num}</div>
            <h3 className="lore-chapter-card-title">{prev.title}</h3>
            <div className="lore-chapter-card-sub">{prev.subtitle}</div>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link href={`/lore/chapter/${next.slug}`} className="lore-chapter-card" style={{ textAlign: "right" }}>
            <div className="lore-chapter-card-num">Chapter {next.num} →</div>
            <h3 className="lore-chapter-card-title">{next.title}</h3>
            <div className="lore-chapter-card-sub">{next.subtitle}</div>
          </Link>
        ) : (
          <Link href="/lore" className="lore-chapter-card" style={{ textAlign: "right" }}>
            <div className="lore-chapter-card-num">↩ Back to chronicle</div>
            <h3 className="lore-chapter-card-title">All Eras</h3>
            <div className="lore-chapter-card-sub">Return to the index</div>
          </Link>
        )}
      </nav>
    </>
  );
}

function Panel({ panel, num }: { panel: LoreChapterPanel; num: number }) {
  const pad = String(num).padStart(2, "0");
  const accent: Accent | undefined = panel.accent as Accent | undefined;

  if (panel.kind === "splash" && (panel.art || panel.image)) {
    return (
      <div className="lore-splash" data-accent={panel.accent ?? "cyan"}>
        <div className="lore-splash-art">
          {panel.image ? (
            <LoreImageEl image={panel.image} credit="corner" />
          ) : panel.art ? (
            <ArtFor kind={panel.art} accent={accent} />
          ) : null}
        </div>
        <div className="lore-splash-panel-num">Panel {pad}</div>
        <div className="lore-splash-overlay">
          {panel.title && <h3>{panel.title}</h3>}
          {panel.caption && <p className="lore-splash-caption">{panel.caption}</p>}
        </div>
      </div>
    );
  }

  if (panel.kind === "quote") {
    return (
      <div className="lore-bubble" data-accent={panel.accent ?? "cyan"}>
        <blockquote>{panel.quote}</blockquote>
        {panel.attribution && <cite>{panel.attribution}</cite>}
      </div>
    );
  }

  // hero / text with side art
  if ((panel.art || panel.image) && panel.artSide && panel.artSide !== "full") {
    return (
      <div
        className="lore-split"
        data-side={panel.artSide}
        data-accent={panel.accent ?? "cyan"}
      >
        <div className="lore-split-art">
          {panel.image ? (
            <LoreImageEl image={panel.image} credit="corner" />
          ) : panel.art ? (
            <ArtFor kind={panel.art} accent={accent} />
          ) : null}
          <div className="lore-splash-panel-num">Panel {pad}</div>
        </div>
        <div className="lore-split-body">
          {panel.title && <h3>{panel.title}</h3>}
          {panel.body && <p>{panel.body}</p>}
        </div>
      </div>
    );
  }

  // Fallback, art-less text/hero panel
  return (
    <div className={`lore-panel ${panel.kind === "hero" ? "lore-panel-hero" : ""}`}>
      <div className="lore-splash-panel-num" style={{ position: "absolute", top: -10, left: 14 }}>
        Panel {pad}
      </div>
      {panel.title && (
        <h3
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "1.25rem",
            color: "var(--lore-cyan)",
            margin: "0 0 12px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {panel.title}
        </h3>
      )}
      {panel.body && <p>{panel.body}</p>}
    </div>
  );
}
