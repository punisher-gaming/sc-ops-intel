"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// Embeds RSI's official starmap (https://robertsspaceindustries.com/starmap)
// in an iframe — RSI doesn't set X-Frame-Options or CSP frame-ancestors on
// that page, so it loads inside ours. Bonus: it's the same UI as the
// in-game starmap, so zoom / pan / click-to-focus all work natively.
//
// Each system gets a slug RSI recognises in the ?system query param. We
// also include a Pyro-was-empty fallback note since some systems return
// blank pages on RSI's side until they release the system officially.

type SystemTab = {
  slug: string;
  name: string;
  blurb: string;
};

const SYSTEMS: SystemTab[] = [
  { slug: "stanton", name: "Stanton", blurb: "UEE corporate-controlled. Four planets, four major moons each, multiple Lagrange stations and refineries." },
  { slug: "pyro", name: "Pyro", blurb: "Lawless border system. Dwarf star, six planets, several outlaw rest stops at Lagrange points." },
  { slug: "nyx", name: "Nyx", blurb: "Levski's home system. Asteroid colony settlements, classic Star Citizen lore." },
  { slug: "terra", name: "Terra", blurb: "UEE capital region. Heavily developed planet Terra (Prime). Not currently flyable in PU." },
  { slug: "magnus", name: "Magnus", blurb: "Industrial system known for shipyards and Borea." },
  { slug: "odin", name: "Odin", blurb: "Frontier mining system." },
];

export function MapBrowser() {
  const router = useRouter();
  const params = useSearchParams();
  const sys = (params.get("system") ?? "stanton").toLowerCase();
  const current = SYSTEMS.find((s) => s.slug === sys) ?? SYSTEMS[0];
  const [iframeError, setIframeError] = useState(false);

  function pickSystem(slug: string) {
    setIframeError(false);
    router.push(`/map?system=${encodeURIComponent(slug)}`);
  }

  return (
    <div className="container-wide" style={{ paddingTop: "1.5rem" }}>
      <div className="page-header" style={{ paddingBottom: "0.75rem" }}>
        <div className="accent-label">Starmap</div>
        <h1>System map · {current.name}</h1>
        <p style={{ maxWidth: "70ch" }}>{current.blurb}</p>
      </div>

      {/* System picker */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {SYSTEMS.map((s) => {
          const active = s.slug === current.slug;
          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => pickSystem(s.slug)}
              style={{
                padding: "6px 14px",
                borderRadius: 18,
                fontSize: "0.85rem",
                cursor: "pointer",
                background: active ? "rgba(77,217,255,0.15)" : "rgba(255,255,255,0.04)",
                color: active ? "var(--accent)" : "var(--text-muted)",
                border: `1px solid ${active ? "rgba(77,217,255,0.45)" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Iframe — full-bleed-ish */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 10",
          minHeight: 520,
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "#03050a",
        }}
      >
        <iframe
          // key forces the iframe to remount when the system changes —
          // otherwise some systems' navigation events don't fire properly.
          key={current.slug}
          src={`https://robertsspaceindustries.com/starmap?system=${encodeURIComponent(current.slug)}`}
          title={`Star Citizen starmap — ${current.name}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          onError={() => setIframeError(true)}
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            background: "#03050a",
          }}
          allow="fullscreen"
        />
      </div>

      {iframeError && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 6,
            background: "rgba(245,185,71,0.08)",
            border: "1px solid rgba(245,185,71,0.3)",
            color: "var(--warn)",
            fontSize: "0.85rem",
          }}
        >
          Map didn&apos;t load. Open it in a new tab:{" "}
          <a
            href={`https://robertsspaceindustries.com/starmap?system=${encodeURIComponent(current.slug)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            robertsspaceindustries.com/starmap?system={current.slug}
          </a>
        </div>
      )}

      <div className="label-mini" style={{ marginTop: 12, textAlign: "center" }}>
        Map data + interactivity © Cloud Imperium Games. Zoom: scroll wheel · Pan: drag · Focus: click any object.
      </div>

      {/* Open-in-new-tab fallback for everyone, not just on iframe error */}
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <a
          href={`https://robertsspaceindustries.com/starmap?system=${encodeURIComponent(current.slug)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="label-mini"
          style={{ color: "var(--accent)" }}
        >
          Open in new tab ↗
        </a>
      </div>
    </div>
  );
}
