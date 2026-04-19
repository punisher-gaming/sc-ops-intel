// Classic Punisher skull — fourth pass after rendering check.
//
// What was wrong before: cheekbone tabs were too small, teeth too thin
// with tiny gaps, eyes too squinty, overall the skull read as a vague
// rounded blob instead of having the iconic angular features.
//
// This pass: dramatic cheekbone hooks (flare WIDER than cranium then
// drop sharply with a corner), wider teeth with chunky black gaps,
// bigger angular eyes, two-part nose preserved.

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
      {/* Skull body silhouette: cranium dome + dramatic cheekbone hooks
          + jaw line where teeth attach. Drawn as one closed path. */}
      <path
        d="
          M 100 8
          C 58 8, 30 18, 26 56
          C 24 78, 28 96, 36 108
          L 22 113
          L 12 122
          L 18 134
          L 32 140
          L 56 144
          L 144 144
          L 168 140
          L 182 134
          L 188 122
          L 178 113
          L 164 108
          C 172 96, 176 78, 174 56
          C 170 18, 142 8, 100 8
          Z
        "
        fill={color}
      />

      {/* Five teeth — wider than before, with chunky gaps between.
          Heights vary dramatically: outer 38, inner 52, middle 60. */}
      <rect x="60"  y="142" width="14" height="40" rx="1" fill={color} />
      <rect x="78"  y="142" width="14" height="52" rx="1" fill={color} />
      <rect x="96"  y="142" width="14" height="58" rx="1" fill={color} />
      <rect x="114" y="142" width="14" height="50" rx="1" fill={color} />
      <rect x="132" y="142" width="14" height="38" rx="1" fill={color} />

      {/* Left eye — concave top edge (angry brow), tapers sharp to
          inner-bottom point near nose. Bigger than before. */}
      <path
        d="
          M 28 50
          Q 56 58, 88 70
          L 96 88
          L 90 92
          Q 56 86, 32 76
          Q 22 64, 28 50
          Z
        "
        fill={bg}
      />

      {/* Right eye — mirror */}
      <path
        d="
          M 172 50
          Q 144 58, 112 70
          L 104 88
          L 110 92
          Q 144 86, 168 76
          Q 178 64, 172 50
          Z
        "
        fill={bg}
      />

      {/* Upper nose diamond — wider, sits above the white divider gap */}
      <path
        d="
          M 100 96
          L 90 108
          L 100 120
          L 110 108
          Z
        "
        fill={bg}
      />

      {/* Lower nose diamond — narrower, pointier, sits below the gap */}
      <path
        d="
          M 100 126
          L 94 134
          L 100 142
          L 106 134
          Z
        "
        fill={bg}
      />
    </svg>
  );
}
