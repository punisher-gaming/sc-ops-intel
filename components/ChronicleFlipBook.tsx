"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CHAPTERS } from "@/lib/lore-data";
import { STORY_PAGES, type StoryPage } from "@/lib/lore-story";
import { LoreImageEl } from "./LoreImage";
import { EarthScene } from "./LoreArt";
import { IMG_COVER } from "@/lib/lore-images";

// Auto-flipping comic book on /lore landing, 14 pages reading
// chronologically as a single narrative comic, not a table of contents.
//
// Page order:
//   0       Front cover (Issue 01 / THE VERSE)
//   1..N    Story pages from STORY_PAGES (one per pivotal event)
//   N+1     Back cover (END OF VOLUME I + read-on CTA)
//
// Each story page is laid out like a real comic panel: image fills the
// page, top caption box gives the year stamp + headline, bottom caption
// box gives the narrator's prose, optional speech-bubble pull-quote
// floats over the art, and an oversized SFX word (KAPOW-style) drops
// over the action when the page warrants it.

const AUTOPLAY_MS = 7200;       // pause on each page (longer = readable)
const FLIP_DURATION = 1600;     // ms for a page to fully turn

export function ChronicleFlipBook() {
  const [idx, setIdx] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const total = STORY_PAGES.length + 2; // cover + N story pages + back cover

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
    setAutoplay(false);
    setIdx(((n % total) + total) % total);
  }

  if (reducedMotion) {
    return <StaticShelf />;
  }

  // What backdrop to show behind the book? The story page currently
  // visible, its image, dimmed and blurred.
  const backdropImage =
    idx === 0 || idx === total - 1
      ? null
      : STORY_PAGES[idx - 1]?.image ?? null;

  return (
    <section className="flipbook-stage">
      <div className="flipbook-backdrop" key={idx}>
        {backdropImage ? (
          <LoreImageEl image={backdropImage} credit="hidden" />
        ) : (
          <EarthScene />
        )}
        <div className="flipbook-backdrop-tint" />
      </div>

      <div className="flipbook-book">
        <div className="flipbook-spine" aria-hidden />

        {/* Page 0, front cover */}
        <Page
          turned={idx > 0}
          zBase={total + 1}
          layer={0}
          duration={FLIP_DURATION}
        >
          <FrontCoverFace />
          <BackFace
            top="Volume I of the Chronicle"
            bottom="A visual history of the Verse"
          />
        </Page>

        {/* Pages 1..N, story panels */}
        {STORY_PAGES.map((page, i) => {
          const pageNum = i + 1;
          const turned = idx > pageNum;
          return (
            <Page
              key={`story-${i}`}
              turned={turned}
              zBase={total + 1 - pageNum}
              layer={pageNum}
              duration={FLIP_DURATION}
            >
              <StoryPageFace page={page} pageNum={pageNum} total={STORY_PAGES.length} />
              <BackFace
                top={`Page ${pageNum} of ${STORY_PAGES.length}`}
                bottom={`${page.year} UEE`}
              />
            </Page>
          );
        })}

        {/* Back cover, under everything */}
        <div className="flipbook-page flipbook-backcover" aria-hidden>
          <div className="flipbook-backcover-face">
            <div className="flipbook-backcover-eyebrow">,  END OF VOLUME I , </div>
            <div className="flipbook-backcover-title">Read on</div>
            <Link
              href="/lore/chapter/origins"
              className="btn btn-primary"
              style={{ marginTop: 14 }}
            >
              Open the Chronicle →
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
          ) : idx === total - 1 ? (
            <span className="flipbook-counter-cover">,  End , </span>
          ) : (
            <>
              <span className="flipbook-counter-num">{STORY_PAGES[idx - 1].year}</span>{" "}
              <span className="flipbook-counter-of">UEE · Page {idx} / {STORY_PAGES.length}</span>
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
function Page({
  children,
  turned,
  zBase,
  layer,
  duration,
}: {
  children: [React.ReactNode, React.ReactNode];
  turned: boolean;
  zBase: number;
  layer: number;
  duration: number;
}) {
  return (
    <div
      className="flipbook-page"
      style={{
        transform: `rotateY(${turned ? -180 : 0}deg)`,
        zIndex: turned ? layer : zBase,
        transition: `transform ${duration}ms cubic-bezier(0.55, 0, 0.45, 1)`,
      }}
    >
      <div className="flipbook-page-face flipbook-page-front">{children[0]}</div>
      <div className="flipbook-page-face flipbook-page-back">{children[1]}</div>
    </div>
  );
}

// ── Front cover, the spectacular opening shot ────────────────────────
function FrontCoverFace() {
  return (
    <>
      <div className="flipbook-cover-art">
        <LoreImageEl image={IMG_COVER} credit="corner" />
      </div>
      {/* Cinematic gradient + radial vignette + corner fades */}
      <div className="flipbook-cover-overlay" />
      <div className="flipbook-cover-vignette" aria-hidden />

      {/* Corner brackets, military / sci-fi book frame */}
      <span className="flipbook-cover-corner tl" aria-hidden />
      <span className="flipbook-cover-corner tr" aria-hidden />
      <span className="flipbook-cover-corner bl" aria-hidden />
      <span className="flipbook-cover-corner br" aria-hidden />

      <div className="flipbook-cover-masthead">
        <div>ISSUE 01</div>
        <div>THE CHRONICLE</div>
      </div>

      {/* Centered title block, bigger, more glow, with decorative bars */}
      <div className="flipbook-cover-title">
        <div className="flipbook-cover-bar-row">
          <span className="flipbook-cover-bar" />
          <div className="flipbook-cover-eyebrow">CITIZENDEX PRESENTS</div>
          <span className="flipbook-cover-bar" />
        </div>
        <h1>
          THE <span>VERSE</span>
        </h1>
        <div className="flipbook-cover-tagline">
          A Chronicle of Empire, Discovery &amp; War
        </div>
        <div className="flipbook-cover-sub">2075, 2952 · UEE CALENDAR</div>
      </div>

      <div className="flipbook-cover-footer">
        <div>
          <div className="flipbook-cover-tag">Volume I</div>
          <div className="flipbook-cover-stars">★ ★ ★ ★ ★</div>
        </div>
        <div className="flipbook-cover-imprint" aria-hidden>
          SAISEI · CROSHAW
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

// ── Story page, the actual comic panel ──────────────────────────────
function StoryPageFace({
  page,
  pageNum,
  total,
}: {
  page: StoryPage;
  pageNum: number;
  total: number;
}) {
  return (
    <>
      {/* Background art fills the page */}
      <div className="flipbook-story-art">
        <LoreImageEl image={page.image} credit="corner" />
      </div>

      {/* Page-number stamp top-right */}
      <div className="flipbook-story-pagenum">
        {String(pageNum).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>

      {/* TOP CAPTION BOX, year + headline */}
      <div className="flipbook-story-top-cap">
        <div className="flipbook-story-year">{page.year}</div>
        <div className="flipbook-story-title">{page.title}</div>
      </div>

      {/* SFX overlay, big stylized sound effect for action moments */}
      {page.sfx && (
        <div className="flipbook-story-sfx" aria-hidden>
          {page.sfx}
        </div>
      )}

      {/* SPEECH BUBBLE, pull-quote rendered as a comic balloon */}
      {page.pullQuote && (
        <div className="flipbook-story-bubble">
          <blockquote>"{page.pullQuote.text}"</blockquote>
          <cite>,  {page.pullQuote.attribution}</cite>
        </div>
      )}

      {/* BOTTOM CAPTION BOX, narrator prose + read-more link */}
      <div className="flipbook-story-bottom-cap">
        <p>{page.narration}</p>
        {page.chapterSlug && (
          <Link
            href={`/lore/chapter/${page.chapterSlug}`}
            className="flipbook-story-readmore"
          >
            Read this chapter in full →
          </Link>
        )}
      </div>
    </>
  );
}

// ── Page back face ────────────────────────────────────────────────────
function BackFace({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div className="flipbook-back-face">
      <div className="flipbook-back-top">{top}</div>
      <div className="flipbook-back-grid" aria-hidden />
      <div className="flipbook-back-bottom">{bottom}</div>
    </div>
  );
}

// ── Reduced-motion fallback ───────────────────────────────────────────
function StaticShelf() {
  return (
    <section style={{ padding: "4rem 1.5rem 2rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div className="lore-hero-eyebrow">◢ The Chronicle · Volume I</div>
        <h1 className="lore-hero-title">The Verse</h1>
        <div className="lore-hero-sub">2075, 2952 · UEE Calendar</div>
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
