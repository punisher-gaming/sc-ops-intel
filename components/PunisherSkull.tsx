// Classic Punisher skull — traced from user-supplied reference (third pass).
//
// Key features I missed in earlier passes:
//   1. Nose is TWO separate diamonds split by a thin white horizontal gap
//      (top diamond is wider; bottom is narrower / pointier)
//   2. Eyes have a concave top edge (curves down → angry brow) and taper
//      to a sharp point at the inner-bottom corner toward the nose
//   3. Cheekbones flare OUT WIDER than the cranium with prominent side
//      tabs that drop down before curving back inward
//   4. Five teeth (not six), middle teeth longest, outer teeth shorter,
//      jagged bottom edge
//
// Renders with `color` (skull) and `bg` (cutouts — eyes, nose, tooth gaps,
// nose-divider gap). `bg` should match the page background so cutouts read
// as real voids.

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
      {/* Skull body: rounded cranium → temple pinch → cheekbone tabs that
          flare wider than the cranium, drop, and curve back to the tooth row */}
      <path
        d="
          M 100 10
          C 65 10, 30 16, 28 56
          C 26 76, 30 92, 38 105
          L 24 110
          Q 16 118, 22 128
          L 36 134
          Q 50 142, 70 142
          L 130 142
          Q 150 142, 164 134
          L 178 128
          Q 184 118, 176 110
          L 162 105
          C 170 92, 174 76, 172 56
          C 170 16, 135 10, 100 10
          Z
        "
        fill={color}
      />

      {/* Five teeth hanging below the cheekbones. Middle teeth are longest,
          outer teeth shorter — gives the iconic ragged jaw. */}
      <rect x="68"  y="140" width="14" height="42" rx="1" fill={color} />
      <rect x="84"  y="140" width="14" height="52" rx="1" fill={color} />
      <rect x="100" y="140" width="14" height="56" rx="1" fill={color} />
      <rect x="116" y="140" width="14" height="50" rx="1" fill={color} />
      <rect x="132" y="140" width="14" height="40" rx="1" fill={color} />

      {/* Left eye socket — concave top edge (angry brow), tapers to a
          sharp inner-bottom point toward the nose */}
      <path
        d="
          M 32 52
          Q 60 60, 88 70
          L 94 86
          L 88 90
          Q 56 84, 36 76
          Q 26 64, 32 52
          Z
        "
        fill={bg}
      />

      {/* Right eye socket — mirror */}
      <path
        d="
          M 168 52
          Q 140 60, 112 70
          L 106 86
          L 112 90
          Q 144 84, 164 76
          Q 174 64, 168 52
          Z
        "
        fill={bg}
      />

      {/* Nose — TWO separate diamonds with a thin white horizontal gap
          between them (the white gap is just the skull color showing
          through, since these two cutouts don't touch) */}

      {/* Upper nose diamond — wider at the top */}
      <path
        d="
          M 100 94
          L 92 104
          L 100 116
          L 108 104
          Z
        "
        fill={bg}
      />

      {/* Lower nose diamond — narrower, pointier */}
      <path
        d="
          M 100 122
          L 95 130
          L 100 138
          L 105 130
          Z
        "
        fill={bg}
      />
    </svg>
  );
}
