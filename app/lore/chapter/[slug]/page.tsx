import Link from "next/link";
import { notFound } from "next/navigation";
import { CHAPTERS, getChapter, type LoreChapterPanel } from "@/lib/lore-data";

// generateStaticParams + dynamicParams = false → every chapter route is
// pre-rendered at build time. Static export ready.
export function generateStaticParams() {
  return CHAPTERS.map((c) => ({ slug: c.slug }));
}
export const dynamicParams = false;

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapter(slug);
  if (!chapter) notFound();

  // Adjacent chapters for the bottom nav. CHAPTERS array is already in
  // chronological order so we can just walk by index.
  const idx = CHAPTERS.findIndex((c) => c.slug === slug);
  const prev = idx > 0 ? CHAPTERS[idx - 1] : null;
  const next = idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;

  return (
    <>
      {/* Hero band */}
      <section className="lore-hero" style={{ minHeight: "55vh", paddingBottom: 0 }}>
        <div className="lore-hero-eyebrow">Chapter {chapter.num}</div>
        <h1 className="lore-hero-title">{chapter.title}</h1>
        <div className="lore-hero-sub">
          {chapter.yearsFrom} — {chapter.yearsTo}
        </div>
        <p className="lore-hero-body">{chapter.subtitle}.</p>
      </section>

      {/* Two-column: sticky timeline left, comic panels right */}
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

        <article>
          {chapter.panels.map((p, i) => (
            <Panel key={i} panel={p} />
          ))}
        </article>
      </div>

      {/* Adjacent chapter nav */}
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

function Panel({ panel }: { panel: LoreChapterPanel }) {
  if (panel.kind === "quote") {
    return (
      <div
        className="lore-panel lore-panel-quote"
        data-accent={panel.accent ?? "cyan"}
      >
        <blockquote>{panel.quote}</blockquote>
        {panel.attribution && <cite>{panel.attribution}</cite>}
      </div>
    );
  }
  if (panel.kind === "hero") {
    return (
      <div className="lore-panel lore-panel-hero">
        {panel.title && <h3>{panel.title}</h3>}
        {panel.body && <p>{panel.body}</p>}
      </div>
    );
  }
  // Default: text panel
  return (
    <div className="lore-panel">
      {panel.title && (
        <h3
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "1.2rem",
            color: "var(--lore-cyan)",
            margin: "0 0 12px",
            letterSpacing: "0.04em",
          }}
        >
          {panel.title}
        </h3>
      )}
      {panel.body && <p>{panel.body}</p>}
    </div>
  );
}
