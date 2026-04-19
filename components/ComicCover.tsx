"use client";

import { useEffect, useRef, useState } from "react";
import {
  EarthScene,
  JumpPoint,
  SpaceScene,
  CityScene,
  DestructionScene,
  type Accent,
} from "./LoreArt";

// Opening cover for /lore that establishes the "this is a comic book"
// metaphor before the visitor scrolls.
//
// What it does:
//   1. Shows a book-like card with a cover art + title + issue number
//   2. Every ~5s the top-right corner curls and turns, revealing a
//      different era-art behind the cover. The peek sticks for a beat,
//      then flips back. Loops through 5 chapter previews.
//   3. "Scroll or click to open ↓" affordance at bottom.
//   4. Reduced-motion users get a static cover (no flipping).
//
// Implementation uses pure CSS 3D transforms — no libraries. The
// "page turn" is a skewed pseudo-element animated with clip-path so
// the curl looks like paper bending rather than a div rotating.

const PEEKS: Array<{ Art: React.ComponentType<{ accent?: Accent }>; accent: Accent; label: string; num: string }> = [
  { Art: EarthScene, accent: "cyan", label: "Origins", num: "I" },
  { Art: SpaceScene, accent: "violet", label: "Early Empire", num: "II" },
  { Art: DestructionScene, accent: "red", label: "Messer Era", num: "III" },
  { Art: CityScene, accent: "amber", label: "Golden Age", num: "V" },
  { Art: JumpPoint, accent: "cyan", label: "Current Era", num: "VI" },
];

export function ComicCover() {
  const [peekIdx, setPeekIdx] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Respect reduced-motion — skip the whole animation
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    mountedRef.current = true;
    // Cycle through peeks: flip in (1.4s) — hold (2s) — flip back (1.4s) — pause (1s)
    const CYCLE = 5800;
    const interval = setInterval(() => {
      setFlipping(true);
      setTimeout(() => setFlipping(false), 2600);
      setTimeout(() => {
        setPeekIdx((i) => (i + 1) % PEEKS.length);
      }, CYCLE);
    }, CYCLE);
    return () => clearInterval(interval);
  }, []);

  const peek = PEEKS[peekIdx];

  return (
    <section className="comic-cover-scene">
      {/* Background art revealed by the flip */}
      <div className="comic-cover-behind" key={peekIdx}>
        <peek.Art accent={peek.accent} />
        <div className="comic-cover-behind-overlay" />
        <div className="comic-cover-behind-label">
          <div className="comic-cover-behind-num">CHAPTER {peek.num}</div>
          <div className="comic-cover-behind-title">{peek.label}</div>
        </div>
      </div>

      {/* The cover itself — a "paper" with 3D flip corner */}
      <div className={`comic-cover-book ${flipping ? "is-flipping" : ""}`}>
        <div className="comic-cover-spine" />
        <div className="comic-cover-page">
          {/* Cover art — cinematic Earth */}
          <div className="comic-cover-page-art">
            <EarthScene />
          </div>
          <div className="comic-cover-page-overlay" />

          {/* Masthead — like a real comic */}
          <div className="comic-cover-masthead">
            <div className="comic-cover-issue">Issue 01 · The Chronicle</div>
          </div>

          {/* Big title */}
          <div className="comic-cover-title">
            <div className="comic-cover-eyebrow">CITIZENDEX PRESENTS</div>
            <h1>
              THE <span className="accent">VERSE</span>
            </h1>
            <div className="comic-cover-sub">
              2075 — 2952 · UEE Calendar
            </div>
          </div>

          {/* Footer — price tag, barcode-ish */}
          <div className="comic-cover-footer">
            <div>
              <div className="comic-cover-tag">Volume I</div>
              <div className="comic-cover-stars">★ ★ ★ ★ ★</div>
            </div>
            <div className="comic-cover-barcode" aria-hidden>
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  style={{ width: i % 2 === 0 ? 2 : 1, opacity: i % 3 === 0 ? 1 : 0.6 }}
                />
              ))}
            </div>
          </div>

          {/* Tear-away corner — the flipping paper triangle */}
          <div className="comic-cover-flip" aria-hidden />
        </div>
      </div>

      {/* Scroll affordance */}
      <div className="comic-cover-scroll-hint">
        <span>Scroll to open</span>
        <span className="comic-cover-arrow">↓</span>
      </div>
    </section>
  );
}
