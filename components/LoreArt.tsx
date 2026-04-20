// SVG art library for the /lore subsite. Every illustration is pure
// vector, no images, no fonts, no external requests, so pages render
// instantly and scale perfectly to any viewport. Everything uses the
// TRON-cyan palette declared in lore.css so art picks up accent tints
// via currentColor when appropriate.
//
// Art is deliberately stylized (silhouettes, halftone, cel-shaded
// linework) rather than photorealistic. The goal is comic-book feel,
// not screenshots. Each component accepts an optional accent colour
// override so specific scenes can go red for war, amber for commerce,
// green for peace, violet for alien, etc.

import type { CSSProperties, ReactElement } from "react";

// ─────────────────────────────────────────────────────────────────
// Shared tokens
// ─────────────────────────────────────────────────────────────────

const ACCENT = {
  cyan:   "#4dd9ff",
  amber:  "#ffb84d",
  red:    "#ff5a6a",
  green:  "#65e69a",
  violet: "#b58cff",
  pink:   "#ff8fd1",
} as const;

export type Accent = keyof typeof ACCENT;

interface ArtProps {
  accent?: Accent;
  className?: string;
  style?: CSSProperties;
}

// ─────────────────────────────────────────────────────────────────
// Starfield, reusable across every scene. Seeded random so it's
// deterministic per instance (no hydration mismatch).
// ─────────────────────────────────────────────────────────────────

function seededStars(seed: number, count: number) {
  const rnd = mulberry32(seed);
  const stars: Array<{ x: number; y: number; r: number; o: number }> = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rnd() * 1000,
      y: rnd() * 600,
      r: rnd() * 1.4 + 0.2,
      o: rnd() * 0.9 + 0.1,
    });
  }
  return stars;
}
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Starfield({ seed = 1, density = 120 }: { seed?: number; density?: number }) {
  const stars = seededStars(seed, density);
  return (
    <g>
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
      ))}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────
// SPACE SCENE, nebula + stars + optional planet. Used as chapter
// hero backdrops. accent drives the nebula colour.
// ─────────────────────────────────────────────────────────────────

export function SpaceScene({
  accent = "cyan",
  seed = 1,
  planet = true,
  className,
  style,
}: ArtProps & { seed?: number; planet?: boolean }) {
  const c = ACCENT[accent];
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id={`neb-${seed}`} cx="30%" cy="40%" r="70%">
          <stop offset="0%" stopColor={c} stopOpacity="0.4" />
          <stop offset="40%" stopColor={c} stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`pl-${seed}`} cx="35%" cy="40%" r="65%">
          <stop offset="0%" stopColor={c} stopOpacity="0.9" />
          <stop offset="55%" stopColor={c} stopOpacity="0.35" />
          <stop offset="100%" stopColor="#03050c" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="1000" height="600" fill="#02050c" />
      <rect width="1000" height="600" fill={`url(#neb-${seed})`} />
      <Starfield seed={seed} density={140} />
      {planet && (
        <g>
          {/* Planet with subtle rim light + terminator */}
          <circle cx="780" cy="380" r="180" fill={`url(#pl-${seed})`} />
          <circle cx="780" cy="380" r="180" fill="none" stroke={c} strokeOpacity="0.35" />
          <circle cx="780" cy="380" r="155" fill="#020309" opacity="0.55"
                  transform="translate(14,14)" />
        </g>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// JUMP POINT, spiraling portal with halos. Used for discovery eras.
// ─────────────────────────────────────────────────────────────────

export function JumpPoint({ accent = "cyan", className, style }: ArtProps) {
  const c = ACCENT[accent];
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="jp-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="30%" stopColor={c} stopOpacity="0.9" />
          <stop offset="70%" stopColor={c} stopOpacity="0.3" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="600" fill="#02050c" />
      <Starfield seed={7} density={100} />
      {/* Rotating rings */}
      {[0, 18, 36, 54, 72].map((rot, i) => (
        <ellipse
          key={i}
          cx="500" cy="300"
          rx={220 - i * 25} ry={60 - i * 7}
          fill="none" stroke={c} strokeOpacity={0.25 + i * 0.1}
          strokeWidth="1.5"
          transform={`rotate(${rot} 500 300)`}
        />
      ))}
      <circle cx="500" cy="300" r="90" fill="url(#jp-core)" />
      <circle cx="500" cy="300" r="45" fill="#fff" opacity="0.7" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// SHIP SILHOUETTES, simple vector profiles. Not actual SC ships
// (trademarked) but readable archetypes.
// ─────────────────────────────────────────────────────────────────

export function ShipFighter({ accent = "cyan", className, style }: ArtProps) {
  const c = ACCENT[accent];
  return (
    <svg className={className} style={style} viewBox="0 0 400 200" aria-hidden>
      {/* UEE-style arrowhead fighter */}
      <g fill={c}>
        <path d="M30 100 L160 80 L230 70 L290 95 L230 130 L160 120 L30 100 Z" opacity="0.9" />
        <path d="M290 95 L350 100 L290 105 Z" opacity="0.7" />
        <path d="M170 80 L210 40 L230 70 Z" opacity="0.6" />
        <path d="M170 120 L210 160 L230 130 Z" opacity="0.6" />
        <circle cx="200" cy="100" r="8" fill="#fff" opacity="0.9" />
      </g>
      <g stroke={c} strokeWidth="1" fill="none" opacity="0.5">
        <line x1="290" y1="95" x2="370" y2="95" />
        <line x1="290" y1="105" x2="370" y2="105" />
      </g>
    </svg>
  );
}

export function ShipVanduul({ accent = "red", className, style }: ArtProps) {
  const c = ACCENT[accent];
  return (
    <svg className={className} style={style} viewBox="0 0 400 200" aria-hidden>
      {/* Vanduul scythe, jagged, hooked */}
      <g fill={c}>
        <path d="M50 100 L130 60 L200 75 L260 95 L200 125 L130 140 L50 100 Z" opacity="0.95" />
        <path d="M130 60 L100 25 L160 65 Z" opacity="0.8" />
        <path d="M130 140 L100 175 L160 135 Z" opacity="0.8" />
        <path d="M260 95 L340 80 L310 100 L340 120 L260 105 Z" opacity="0.7" />
        <circle cx="170" cy="100" r="6" fill="#fff" opacity="0.95" />
      </g>
      <g stroke="#fff" strokeWidth="0.8" opacity="0.4">
        <path d="M70 90 L120 90 M70 110 L120 110" />
      </g>
    </svg>
  );
}

export function ShipTrader({ accent = "amber", className, style }: ArtProps) {
  const c = ACCENT[accent];
  return (
    <svg className={className} style={style} viewBox="0 0 400 200" aria-hidden>
      {/* Banu trader, bulbous hull with module pods */}
      <g fill={c}>
        <ellipse cx="200" cy="100" rx="120" ry="42" opacity="0.9" />
        <rect x="80" y="80" width="30" height="40" opacity="0.75" />
        <rect x="290" y="80" width="30" height="40" opacity="0.75" />
        <rect x="175" y="60" width="50" height="15" opacity="0.8" />
        <circle cx="200" cy="100" r="10" fill="#fff" opacity="0.9" />
      </g>
      <g stroke={c} strokeWidth="1.2" fill="none" opacity="0.5">
        <polygon points="155,95 165,105 175,95 165,85" />
        <polygon points="225,95 235,105 245,95 235,85" />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// BATTLE SCENE, two ships firing tracers past each other
// ─────────────────────────────────────────────────────────────────

export function BattleScene({ accent = "red", className, style }: ArtProps) {
  const c = ACCENT[accent];
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <rect width="1000" height="600" fill="#02050c" />
      <Starfield seed={11} density={90} />
      {/* Explosion bloom */}
      <defs>
        <radialGradient id="boom">
          <stop offset="0%" stopColor="#ffb84d" stopOpacity="1" />
          <stop offset="40%" stopColor={c} stopOpacity="0.7" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="620" cy="270" r="120" fill="url(#boom)" />
      {/* Tracer fire */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={150 + i * 20}
          y1={200 + i * 18}
          x2={450 + i * 20}
          y2={260 + i * 14}
          stroke={c}
          strokeWidth="2"
          opacity="0.7"
        />
      ))}
      {/* Ally fighter */}
      <g transform="translate(80, 240) scale(0.6)" opacity="0.95">
        <path d="M30 100 L160 80 L230 70 L290 95 L230 130 L160 120 L30 100 Z" fill="#4dd9ff" />
      </g>
      {/* Enemy fighter, crashing */}
      <g transform="translate(540, 220) scale(0.55) rotate(35)" opacity="0.9">
        <path d="M50 100 L130 60 L200 75 L260 95 L200 125 L130 140 L50 100 Z" fill={c} />
        <path d="M130 60 L100 25 L160 65 Z" fill={c} opacity="0.7" />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// PLANET with orbital rings, used for system headers
// ─────────────────────────────────────────────────────────────────

export function PlanetOrbit({
  accent = "cyan",
  planets = 3,
  className,
  style,
}: ArtProps & { planets?: number }) {
  const c = ACCENT[accent];
  const orbits = Array.from({ length: planets }, (_, i) => ({
    r: 140 + i * 60,
    angle: (i * 47 + 20) % 360,
  }));
  return (
    <svg className={className} style={style} viewBox="0 0 800 500" aria-hidden>
      <defs>
        <radialGradient id="sun-core">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="40%" stopColor={c} stopOpacity="0.95" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill="#02050c" />
      <Starfield seed={3} density={60} />
      {/* Sun */}
      <circle cx="400" cy="250" r="55" fill="url(#sun-core)" />
      {/* Orbital rings */}
      {orbits.map((o, i) => (
        <g key={i}>
          <ellipse
            cx="400" cy="250"
            rx={o.r} ry={o.r * 0.3}
            fill="none"
            stroke={c} strokeOpacity="0.3" strokeDasharray="3,5"
          />
          <circle
            cx={400 + o.r * Math.cos((o.angle * Math.PI) / 180)}
            cy={250 + o.r * 0.3 * Math.sin((o.angle * Math.PI) / 180)}
            r={6 + i * 2}
            fill={c}
            opacity="0.85"
          />
        </g>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// RACE PORTRAITS, abstract silhouettes. Not meant to depict the
// species accurately; they're iconic "data" portraits.
// ─────────────────────────────────────────────────────────────────

export function RacePortrait({
  race,
  className,
  style,
}: {
  race: "human" | "xian" | "banu" | "vanduul" | "tevarin";
  className?: string;
  style?: CSSProperties;
}) {
  const scheme: Record<string, { c: string; icon: ReactElement }> = {
    human: {
      c: ACCENT.cyan,
      icon: (
        // Oval helmet + rounded shoulders
        <g>
          <ellipse cx="200" cy="130" rx="70" ry="85" />
          <path d="M110 260 Q200 190 290 260 L290 340 L110 340 Z" />
          <circle cx="175" cy="125" r="8" fill="#000" opacity="0.8" />
          <circle cx="225" cy="125" r="8" fill="#000" opacity="0.8" />
        </g>
      ),
    },
    xian: {
      c: ACCENT.violet,
      icon: (
        // Elongated skull + narrow shoulders + antenna-like ridges
        <g>
          <ellipse cx="200" cy="140" rx="55" ry="100" />
          <path d="M200 45 L185 20 M200 45 L215 20" stroke={ACCENT.violet} strokeWidth="4" fill="none" />
          <path d="M130 280 Q200 220 270 280 L270 340 L130 340 Z" />
          <path d="M175 140 L190 145 L175 155 Z" fill="#000" opacity="0.9" />
          <path d="M225 140 L210 145 L225 155 Z" fill="#000" opacity="0.9" />
        </g>
      ),
    },
    banu: {
      c: ACCENT.amber,
      icon: (
        // Rounded jowls + broad chest
        <g>
          <ellipse cx="200" cy="140" rx="80" ry="80" />
          <ellipse cx="160" cy="175" rx="22" ry="15" opacity="0.7" />
          <ellipse cx="240" cy="175" rx="22" ry="15" opacity="0.7" />
          <path d="M95 250 Q200 195 305 250 L305 340 L95 340 Z" />
          <circle cx="175" cy="130" r="7" fill="#000" opacity="0.85" />
          <circle cx="225" cy="130" r="7" fill="#000" opacity="0.85" />
          <path d="M185 165 Q200 175 215 165" stroke="#000" strokeWidth="2" fill="none" opacity="0.6" />
        </g>
      ),
    },
    vanduul: {
      c: ACCENT.red,
      icon: (
        // Horned, angular, predatory
        <g>
          <path d="M140 90 L200 55 L260 90 L275 170 L240 215 L160 215 L125 170 Z" />
          <path d="M140 90 L100 40 L130 85 Z" />
          <path d="M260 90 L300 40 L270 85 Z" />
          <path d="M110 245 Q200 195 290 245 L290 340 L110 340 Z" />
          <path d="M170 140 L195 150 L170 160 Z" fill="#000" />
          <path d="M230 140 L205 150 L230 160 Z" fill="#000" />
          <path d="M180 200 L200 215 L220 200" stroke="#000" strokeWidth="3" fill="none" />
        </g>
      ),
    },
    tevarin: {
      c: ACCENT.green,
      icon: (
        // Crest + angular jaw
        <g>
          <ellipse cx="200" cy="150" rx="65" ry="80" />
          <path d="M200 68 L175 40 M200 68 L200 30 M200 68 L225 40" stroke={ACCENT.green} strokeWidth="4" fill="none" />
          <path d="M120 270 Q200 210 280 270 L280 340 L120 340 Z" />
          <circle cx="175" cy="140" r="7" fill="#000" opacity="0.85" />
          <circle cx="225" cy="140" r="7" fill="#000" opacity="0.85" />
          <path d="M175 200 L225 200" stroke="#000" strokeWidth="2" opacity="0.6" />
        </g>
      ),
    },
  };
  const s = scheme[race];
  return (
    <svg className={className} style={style} viewBox="0 0 400 340" aria-hidden>
      <defs>
        <linearGradient id={`p-${race}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={s.c} stopOpacity="0.7" />
          <stop offset="100%" stopColor={s.c} stopOpacity="0.15" />
        </linearGradient>
        <pattern id={`grid-${race}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M 6 0 L 0 0 0 6" fill="none" stroke={s.c} strokeOpacity="0.15" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="400" height="340" fill={`url(#grid-${race})`} />
      {/* Frame brackets */}
      <path d="M8 8 L8 40 M8 8 L40 8" stroke={s.c} strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M392 332 L392 300 M392 332 L360 332" stroke={s.c} strokeWidth="2" fill="none" opacity="0.7" />
      <g fill={`url(#p-${race})`} stroke={s.c} strokeWidth="1.2" opacity="0.95">
        {s.icon}
      </g>
      {/* Scanlines */}
      <g opacity="0.12">
        {Array.from({ length: 40 }).map((_, i) => (
          <line key={i} x1="0" x2="400" y1={i * 9} y2={i * 9} stroke={s.c} strokeWidth="0.5" />
        ))}
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// EARTH, stylized cradle planet for origin chapters
// ─────────────────────────────────────────────────────────────────

export function EarthScene({ accent = "cyan", className, style }: ArtProps) {
  const c = ACCENT[accent];
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="earth" cx="40%" cy="40%" r="65%">
          <stop offset="0%" stopColor={c} stopOpacity="1" />
          <stop offset="50%" stopColor="#1a5a8a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#020a14" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="1000" height="600" fill="#010307" />
      <Starfield seed={2} density={150} />
      <circle cx="500" cy="700" r="480" fill="url(#earth)" />
      {/* Atmosphere glow */}
      <circle cx="500" cy="700" r="480" fill="none" stroke={c} strokeOpacity="0.5" strokeWidth="3" />
      <circle cx="500" cy="700" r="500" fill="none" stroke={c} strokeOpacity="0.15" strokeWidth="20" />
      {/* Satellite silhouette */}
      <g transform="translate(720, 180)" opacity="0.85">
        <rect x="0" y="-3" width="40" height="6" fill={c} />
        <rect x="-12" y="-18" width="14" height="36" fill="#fff" opacity="0.6" />
        <rect x="38" y="-18" width="14" height="36" fill="#fff" opacity="0.6" />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// CITY SILHOUETTE, for colony / golden age panels
// ─────────────────────────────────────────────────────────────────

export function CityScene({ accent = "amber", className, style }: ArtProps) {
  const c = ACCENT[accent];
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#02050c" />
          <stop offset="60%" stopColor={c} stopOpacity="0.15" />
          <stop offset="100%" stopColor={c} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect width="1000" height="600" fill="url(#sky)" />
      <Starfield seed={5} density={60} />
      {/* Layered skyline, back row */}
      <g fill="#050b18" opacity="0.8">
        {Array.from({ length: 14 }).map((_, i) => (
          <rect
            key={i}
            x={i * 72 - 10}
            y={280 + (i % 3) * 40}
            width={60}
            height={600}
          />
        ))}
      </g>
      {/* Front row, taller */}
      <g fill="#020408">
        {[100, 180, 260, 370, 470, 560, 660, 770, 850, 930].map((x, i) => (
          <g key={i}>
            <rect x={x} y={340 - (i % 5) * 35} width={60} height={500} />
            <rect
              x={x + 25} y={320 - (i % 5) * 35}
              width={10} height={40} fill={c} opacity="0.9"
            />
          </g>
        ))}
      </g>
      {/* Window lights */}
      <g fill={c} opacity="0.8">
        {Array.from({ length: 90 }).map((_, i) => {
          const rx = (i * 37) % 1000;
          const ry = 380 + ((i * 23) % 200);
          return <rect key={i} x={rx} y={ry} width="3" height="3" />;
        })}
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// DESTRUCTION, for Vanduul / war panels. Burning world silhouette.
// ─────────────────────────────────────────────────────────────────

export function DestructionScene({ accent = "red", className, style }: ArtProps) {
  const c = ACCENT[accent];
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="hell">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="20%" stopColor="#ffb84d" stopOpacity="0.95" />
          <stop offset="55%" stopColor={c} stopOpacity="0.7" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="600" fill="#02050c" />
      <Starfield seed={13} density={60} />
      {/* Burning planet */}
      <circle cx="500" cy="700" r="400" fill="#0a0408" />
      <circle cx="500" cy="700" r="400" fill="url(#hell)" opacity="0.9" />
      {[0, 1, 2, 3].map((i) => (
        <circle
          key={i}
          cx={300 + i * 140}
          cy={340 + (i % 2) * 40}
          r={20 + i * 6}
          fill="url(#hell)"
          opacity="0.9"
        />
      ))}
      {/* Descending raider ships as silhouettes */}
      {[{x:200,y:120},{x:450,y:80},{x:700,y:150},{x:820,y:100}].map((p, i) => (
        <g key={i} transform={`translate(${p.x}, ${p.y}) scale(0.3)`} opacity="0.9">
          <path d="M50 100 L130 60 L200 75 L260 95 L200 125 L130 140 L50 100 Z" fill={c} />
        </g>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// UEE FLAG, for political panels
// ─────────────────────────────────────────────────────────────────

export function UEEInsignia({ accent = "cyan", className, style }: ArtProps) {
  const c = ACCENT[accent];
  return (
    <svg className={className} style={style} viewBox="0 0 400 400" aria-hidden>
      <defs>
        <radialGradient id="ins-glow">
          <stop offset="0%" stopColor={c} stopOpacity="0.5" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="#02050c" />
      <circle cx="200" cy="200" r="180" fill="url(#ins-glow)" />
      {/* Shield outline */}
      <path
        d="M200 40 L340 100 L340 230 Q340 320 200 360 Q60 320 60 230 L60 100 Z"
        fill="none" stroke={c} strokeWidth="3" opacity="0.9"
      />
      {/* Inner shield */}
      <path
        d="M200 70 L310 120 L310 225 Q310 305 200 335 Q90 305 90 225 L90 120 Z"
        fill={c} fillOpacity="0.06" stroke={c} strokeOpacity="0.5" strokeWidth="1.5"
      />
      {/* Eagle/star glyph */}
      <g fill={c} opacity="0.95">
        <polygon points="200,120 215,165 260,165 225,195 238,240 200,215 162,240 175,195 140,165 185,165" />
      </g>
      <text
        x="200" y="295"
        fontFamily="var(--font-mono), monospace"
        fontWeight="700"
        fontSize="22"
        letterSpacing="4"
        textAnchor="middle"
        fill={c}
      >
        UEE
      </text>
    </svg>
  );
}
