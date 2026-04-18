// Classic Punisher skull — traced from user-supplied reference:
//   - rounded cranium
//   - cheekbone flare with small side tabs
//   - angry angled eye slits (sharp point toward nose)
//   - diamond/tilde nose cavity
//   - SIX long teeth hanging below the jawline (middle two longest)
//
// Rendered as two colors: `color` (the skull) and `bg` (the cutouts — eyes,
// nose, gaps between teeth). On a dark page, bg should match the page bg so
// the cutouts read as voids.

export function PunisherSkull({
  size = 24,
  color = "#e6ecf2",
  bg = "#05070d",
}: {
  size?: number;
  color?: string;
  bg?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Punisher Gaming"
    >
      {/* Skull body: cranium + cheekbone flare, bottoms out at tooth line */}
      <path
        d="
          M 100 8
          C 60 8, 20 28, 18 78
          C 18 98, 26 114, 40 120
          L 32 132
          L 48 138
          L 52 144
          L 62 144
          L 62 150
          L 138 150
          L 138 144
          L 148 144
          L 152 138
          L 168 132
          L 160 120
          C 174 114, 182 98, 182 78
          C 180 28, 140 8, 100 8
          Z
        "
        fill={color}
      />

      {/* Six teeth — middle teeth are longest, outer teeth shorter.
          Slight bottom rounding via rx keeps it from looking too boxy. */}
      <rect x="62" y="148" width="12" height="42" rx="1" fill={color} />
      <rect x="76" y="148" width="12" height="46" rx="1" fill={color} />
      <rect x="90" y="148" width="12" height="50" rx="1" fill={color} />
      <rect x="104" y="148" width="12" height="50" rx="1" fill={color} />
      <rect x="118" y="148" width="12" height="46" rx="1" fill={color} />
      <rect x="132" y="148" width="12" height="42" rx="1" fill={color} />

      {/* Left eye socket — angry slit, outer-top thick, tapers sharp toward
          the nose at inner-bottom */}
      <path
        d="
          M 34 54
          L 88 68
          L 94 84
          L 88 88
          L 40 78
          Q 28 70, 34 54
          Z
        "
        fill={bg}
      />

      {/* Right eye socket — mirror */}
      <path
        d="
          M 166 54
          L 112 68
          L 106 84
          L 112 88
          L 160 78
          Q 172 70, 166 54
          Z
        "
        fill={bg}
      />

      {/* Nose cavity — diamond with a tilde pinch at the middle ("bow-tie") */}
      <path
        d="
          M 100 92
          L 93 102
          L 96 110
          L 92 120
          L 100 128
          L 108 120
          L 104 110
          L 107 102
          Z
        "
        fill={bg}
      />
    </svg>
  );
}
