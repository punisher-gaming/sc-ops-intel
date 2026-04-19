"use client";

import { useEffect, useState } from "react";

// Where blocked Discord IDs end up. The DB trigger refuses the auth.users
// INSERT, exchangeCodeForSession() returns an error, and the callback page
// recognises the "BLOCKED_DISCORD_USER" string in the error message and
// routes here.
//
// Visual: full-screen red strobe + glitched "ACCESS DENIED" headline +
// CITIZENDEX security stamp. Plays once on mount, then settles to a
// steady-state warning so it's not seizure-territory if they linger.

export default function AccessDeniedPage() {
  const [phase, setPhase] = useState<"strobe" | "settled">("strobe");

  useEffect(() => {
    // Strobe for 2s, then settle. The keyframes themselves are timed so
    // this hand-off happens between flashes (no visual jank).
    const t = setTimeout(() => setPhase("settled"), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontFamily: "var(--font-mono)",
        textAlign: "center",
        padding: "1rem",
      }}
    >
      {/* Strobe layer — full red wash, opacity-keyed via animation */}
      {phase === "strobe" && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "#ff1a1a",
            animation: "strobe-flash 0.18s steps(1, end) infinite",
            mixBlendMode: "screen",
            zIndex: 1,
          }}
        />
      )}

      {/* Scanline overlay — always on for the CRT vibe */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.55) 3px, rgba(0,0,0,0.55) 3px)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* The headline — glitch-shifted, blood-red, jittering */}
      <h1
        style={{
          position: "relative",
          zIndex: 3,
          fontSize: "clamp(3rem, 12vw, 8rem)",
          fontWeight: 900,
          letterSpacing: "0.08em",
          margin: 0,
          color: "#ff2d2d",
          textShadow:
            "-3px 0 0 #00f5ff, 3px 0 0 #ff003c, 0 0 32px rgba(255,45,45,0.7)",
          animation:
            phase === "strobe"
              ? "deny-shake 0.08s steps(1, end) infinite"
              : "deny-shake-slow 1.2s ease-in-out infinite",
        }}
      >
        ACCESS DENIED
      </h1>

      <div
        style={{
          position: "relative",
          zIndex: 3,
          marginTop: "1.5rem",
          fontSize: "clamp(0.9rem, 2.5vw, 1.2rem)",
          color: "#ffaaaa",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
        }}
      >
        ▰ CITIZENDEX SECURITY ▰
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 3,
          marginTop: "2rem",
          maxWidth: "60ch",
          color: "rgba(255,255,255,0.85)",
          fontSize: "0.95rem",
          lineHeight: 1.6,
        }}
      >
        Your Discord ID has been blocked from this site. This action was taken
        by a site administrator. If you believe this is in error, contact the
        admin team — but don&apos;t hold your breath.
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 3,
          marginTop: "2.5rem",
          fontSize: "0.7rem",
          color: "rgba(255,255,255,0.4)",
          fontFamily: "var(--font-mono)",
        }}
      >
        ERR_DISCORD_BLOCKED · auth.users INSERT denied · {new Date().toISOString()}
      </div>

      <a
        href="/"
        style={{
          position: "relative",
          zIndex: 3,
          marginTop: "2rem",
          color: "#ff8a8a",
          fontSize: "0.8rem",
          textDecoration: "underline",
          letterSpacing: "0.1em",
        }}
      >
        ← Return to civilian airspace
      </a>

      {/* Local keyframes — kept inline so this page stays self-contained.
          (globals.css doesn't need to know about the strobe.) */}
      <style>{`
        @keyframes strobe-flash {
          0%, 49%   { opacity: 0.0; }
          50%, 100% { opacity: 0.55; }
        }
        @keyframes deny-shake {
          0%   { transform: translate(0, 0); }
          25%  { transform: translate(-4px, 2px); }
          50%  { transform: translate(3px, -2px); }
          75%  { transform: translate(-2px, 3px); }
          100% { transform: translate(2px, -3px); }
        }
        @keyframes deny-shake-slow {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-1px, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          h1 { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
