"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CHAPTERS } from "@/lib/lore-data";
import { LoreImageEl } from "./LoreImage";
import { EarthScene, SpaceScene, JumpPoint, CityScene, DestructionScene } from "./LoreArt";

// Auto-flipping comic book on /lore landing. Instead of a single cover
// with a random peeking corner, this walks chronologically through every
// chapter as pages that actually turn on the left spine.
//
// Page model (how it looks physically):
//   - front cover (always visible first)
//   - chapter pages stacked behind it, each with a FRONT face (chapter
//     art + era number + title) and a BACK face (the previous era's
//     closing note, styled as the comic's inside back cover)
//   - as pages turn (rotateY from 0 to -180deg around the spine) they
//     reveal the next chapter underneath
//
// The trick for stacking: we render every page absolutely positioned,
// with z-index decreasing by index. Pages at indexes BELOW the current
// one are rendered already-flipped (rotateY -180). Transitions run only
// on the boundary page.

const AUTOPLAY_MS = 5500;       // pause on each page
const FLIP_DURATION = 1600;     // ms for a page to fully turn

export function ChronicleFlipBook() {
  // idx 0 = front cover visible; 1..N = chapter N visible after turning
  // that many pages. When idx === CHAPTERS.length + 1 we loop back.
  const [idx, setIdx] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const total = CHAPTERS.length + 1; // cover + all chapters

  // Respect reduced-motion — no autoplay, show a static grid of covers
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  useEffect(() => {
    if (!autoplay || reducedMotion) return;
    tickRef.current = setTimeout(() => {
      setIdx((i) => (i + 1) % total);
    }, AUTOPLAY_MS);
    return () => {
      if (tickRef.current) clearTimeout(tickRef.current);
    };
  }, [idx, autoplay, reducedMotion, total]);

  function go(n: number) {
    setAutoplay(false);               // manual override wins
    setIdx(((n % total) + total) % total);
  }

  // Reduced-motion fallback — show a static shelf of covers
  if (reducedMotion) {
    return <StaticShelf />;
  }

  return (
    <section className="flipbook-stage">
      {/* Ambient art behind the book — shifts per chapter for extra life */}
      <div className="flipbook-backdrop" key={idx}>
        <BackdropFor idx={idx} />
        <div className="flipbook-backdrop-tint" />
      </div>

      {/* The book itself */}
      <div className="flipbook-book">
        <div className="flipbook-spine" aria-hidden />

        {/* Front cover — page 0 */}
        <Page
          className="flipbook-cover"
          turned={idx > 0}
          zBase={total + 1}
          layer={0}
          duration={FLIP_DURATION}
        >
          <FrontCoverFace />
          <BackFace
            leftBlurb="Volume I of the Chronicle"
            rightBlurb="A visual history of the Verse"
          />
        </Page>

        {/* One "page" per chapter — the front face is THIS chapter */}
        {CHAPTERS.map((c, i) => {
          const pageNum = i + 1;
          const turned = idx > pageNum;
          return (
            <Page
              key={c.slug}
              turned={turned}
              zBase={total + 1 - pageNum}
              layer={pageNum}
              duration={FLIP_DURATION}
            >
              <ChapterFace chapter={c} />
              <BackFace
                leftBlurb={`End of Chapter ${c.num}`}
                rightBlurb={c.title}
              />
            </Page>
          );
        })}

        {/* Back cover — always underneath everything so when all pages
            are flipped, the reader sees the inside back cover */}
        <div className="flipbook-page flipbook-backcover" aria-hidden>
          <div className="flipbook-backcover-face">
            <div className="flipbook-backcover-eyebrow">— END OF VOLUME I —</div>
            <div className="flipbook-backcover-title">Read on</div>
            <Link href="/lore/chapter/origins" className="btn btn-primary" style={{ marginTop: 14 }}>
              Start from Chapter I →
            </Link>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flipbook-controls">
        <button
          type="button"
          className="flipbook-btn"
          onClick={() => go(idx - 1)}
          aria-label="Previous page"
        >
          ←
        </button>
        <div className="flipbook-counter">
          {idx === 0 ? (
            <span className="flipbook-counter-cover">Cover</span>
          ) : (
            <>
              <span>Chapter</span>{" "}
              <span className="flipbook-counter-num">{CHAPTERS[idx - 1]?.num}</span>{" "}
              <span className="flipbook-counter-of">of {CHAPTERS.length}</span>
            </>
          )}
        </div>
        <button
          type="button"
          className="flipbook-btn"
          onClick={() => go(idx + 1)}
          aria-label="Next page"
        >
          →
        </button>
        <button
          type="button"
          className="flipbook-btn flipbook-btn-secondary"
          onClick={() => setAutoplay((v) => !v)}
          aria-label={autoplay ? "Pause autoplay" : "Resume autoplay"}
        >
          {autoplay ? "⏸ Pause" : "▶ Play"}
        </button>
      </div>
    </section>
  );
}

// ── Page primitive ────────────────────────────────────────────────────
// Each page is a flex card that rotates 180° around its left spine.
// Contains two children (front + back faces) — we stack them with
// absolute positioning + backface-visibility so the back appears
// mirror-flipped (correct) when the page has turned.
function Page({
  children,
  turned,
  zBase,
  layer,
  duration,
  className = "",
}: {
  children: [React.ReactNode, React.ReactNode];
  turned: boolean;
  zBase: number;
  layer: number;
  duration: number;
  className?: string;
}) {
  return (
    <div
      className={`flipbook-page ${className}`}
      style={{
        transform: `rotateY(${turned ? -180 : 0}deg)`,
        zIndex: turned ? layer : zBase,
        transition: `transform ${duration}ms cubic-bezier(0.55, 0, 0.45, 1)`,
      }}
    >
      <div className="flipbook-page-face flipbook-page-front">
        {children[0]}
      </div>
      <div className="flipbook-page-face flipbook-page-back">
        {children[1]}
      </div>
    </div>
  );
}

// ── Front cover art ────────────────────────────────────────────────────
function FrontCoverFace() {
  return (
    <>
      <div className="flipbook-cover-art">
        <EarthScene />
      </div>
      <div className="flipbook-cover-overlay" />
      <div className="flipbook-cover-masthead">
        <div>ISSUE 01</div>
        <div>THE CHRONICLE</div>
      </div>
      <div className="flipbook-cover-title">
        <div className="flipbook-cover-eyebrow">CITIZENDEX PRESENTS</div>
        <h1>
          THE <span>VERSE</span>
        </h1>
        <div className="flipbook-cover-sub">2075 — 2952 · UEE CALENDAR</div>
      </div>
      <div className="flipbook-cover-footer">
        <div>
          <div className="flipbook-cover-tag">Volume I</div>
          <div className="flipbook-cover-stars">★ ★ ★ ★ ★</div>
        </div>
        <div className="flipbook-cover-barcode" aria-hidden>
          {Array.from({ length: 22 }).map((_, i) => (
            <span
              key={i}
              style={{ width: i % 2 === 0 ? 2 : 1, opacity: i % 3 === 0 ? 1 : 0.6 }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ── Chapter page — front face ─────────────────────────────────────────
function ChapterFace({ chapter }: { chapter: (typeof CHAPTERS)[number] }) {
  return (
    <>
      <div className="flipbook-chapter-art">
        {chapter.heroImage ? (
          <LoreImageEl image={chapter.heroImage} credit="corner" />
        ) : (
          <ArtFallback slug={chapter.slug} />
        )}
      </div>
      <div className="flipbook-chapter-overlay" />
      <div className="flipbook-chapter-corner">CHAPTER {chapter.num}</div>
      <div className="flipbook-chapter-title">
        <div className="flipbook-chapter-years">
          {chapter.yearsFrom} — {chapter.yearsTo}
        </div>
        <h2>{chapter.title}</h2>
        <div className="flipbook-chapter-sub">{chapter.subtitle}</div>
        <p className="flipbook-chapter-blurb">{chapter.blurb}</p>
        <Link
          href={`/lore/chapter/${chapter.slug}`}
          className="flipbook-chapter-cta"
        >
          Read Chapter {chapter.num} →
        </Link>
      </div>
    </>
  );
}

// ── Back of a page — the "wrong side" shown while turning ─────────────
function BackFace({ leftBlurb, rightBlurb }: { leftBlurb: string; rightBlurb: string }) {
  return (
    <div className="flipbook-back-face">
      <div className="flipbook-back-top">{leftBlurb}</div>
      <div className="flipbook-back-grid" aria-hidden />
      <div className="flipbook-back-bottom">{rightBlurb}</div>
    </div>
  );
}

// ── Ambient backdrop changes per page ──────────────────────────────────
function BackdropFor({ idx }: { idx: number }) {
  // idx 0 = cover (Earth). idx 1..N = that chapter's art.
  const chapter = idx > 0 ? CHAPTERS[idx - 1] : null;
  if (!chapter) return <EarthScene />;
  if (chapter.heroImage) return <LoreImageEl image={chapter.heroImage} credit="hidden" />;
  return <ArtFallback slug={chapter.slug} />;
}

function ArtFallback({ slug }: { slug: string }) {
  switch (slug) {
    case "origins":       return <EarthScene />;
    case "early-empire":  return <SpaceScene accent="violet" seed={3} />;
    case "messer-era":    return <DestructionScene accent="red" />;
    case "liberation":    return <CityScene accent="green" />;
    case "golden-age":    return <CityScene accent="amber" />;
    case "current-era":   return <JumpPoint accent="cyan" />;
    default:              return <SpaceScene />;
  }
}

// ── Static fallback for reduced-motion users ──────────────────────────
function StaticShelf() {
  return (
    <section style={{ padding: "4rem 1.5rem 2rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div className="lore-hero-eyebrow">◢ The Chronicle · Volume I</div>
        <h1 className="lore-hero-title">The Verse</h1>
        <div className="lore-hero-sub">2075 — 2952 · UEE Calendar</div>
      </div>
      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {CHAPTERS.map((c) => (
          <Link key={c.slug} href={`/lore/chapter/${c.slug}`} className="lore-chapter-card">
            <div className="lore-chapter-card-num">Chapter {c.num}</div>
            <h3 className="lore-chapter-card-title">{c.title}</h3>
            <p className="lore-chapter-card-blurb">{c.blurb}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
