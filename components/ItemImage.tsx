"use client";

import { useEffect, useState } from "react";
import { resolveFirstMatch } from "@/lib/item-media";

// Lazy-loads an item/ship image from starcitizen.tools via the MediaWiki
// API. Tries candidate titles in order. Renders a subtle loading state,
// the image once resolved, or a labeled placeholder if nothing matched.
//
// `kind` controls the placeholder glyph and the aspect ratio — ships
// render wide (16/10), items square.

export function ItemImage({
  candidates,
  kind,
  alt,
  size = 400,
}: {
  candidates: Array<string | null | undefined>;
  kind: "ship" | "item";
  alt: string;
  size?: number;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "found"; url: string }
    | { status: "missing" }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    resolveFirstMatch(candidates, size)
      .then((url) => {
        if (cancelled) return;
        setState(url ? { status: "found", url } : { status: "missing" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "missing" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates.join("|"), size]);

  const aspect = kind === "ship" ? "16 / 10" : "1 / 1";

  const wrapperStyle: React.CSSProperties = {
    width: "100%",
    aspectRatio: aspect,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  };

  if (state.status === "loading") {
    return (
      <div style={wrapperStyle}>
        <div
          style={{
            color: "var(--text-dim)",
            fontSize: "0.75rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Loading image…
        </div>
      </div>
    );
  }

  if (state.status === "found") {
    return (
      <div style={wrapperStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={state.url}
          alt={alt}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
    );
  }

  // missing
  return (
    <div style={wrapperStyle}>
      <div style={{ textAlign: "center", color: "var(--text-dim)" }}>
        <div style={{ fontSize: "2rem", opacity: 0.4, marginBottom: 6 }}>
          {kind === "ship" ? "✈" : "▣"}
        </div>
        <div
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          No image
        </div>
      </div>
    </div>
  );
}

// Credit line shown under the image — the wiki expects attribution when
// we embed their media.
export function ItemImageCredit() {
  return (
    <div
      style={{
        marginTop: 8,
        fontSize: "0.7rem",
        color: "var(--text-dim)",
        letterSpacing: "0.06em",
      }}
    >
      Image via{" "}
      <a
        href="https://starcitizen.tools"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--accent)" }}
      >
        starcitizen.tools
      </a>
      {" "}· CC BY-NC-SA 4.0
    </div>
  );
}
