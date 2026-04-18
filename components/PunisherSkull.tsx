// Small skull mark used in the nav — clean white-on-transparent, no effects.
// Kept as a React component (not inlined) so we can swap the size/color if
// we want to use it in a different context later.
export function PunisherSkull({ size = 24, color = "#e6ecf2", bg = "#05070d" }: { size?: number; color?: string; bg?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Punisher Gaming"
    >
      <path
        d="M 45,50 C 45,14 70,8 100,8 C 130,8 155,14 155,50 L 155,76 Q 153,89 140,96 Q 156,106 156,118 Q 152,130 138,138 L 138,196 L 62,196 L 62,138 Q 48,130 44,118 Q 44,106 60,96 Q 47,89 45,76 Z"
        fill={color}
      />
      <path d="M 55,48 L 89,60 L 93,84 L 55,76 Q 44,62 55,48 Z" fill={bg} />
      <path d="M 145,48 L 111,60 L 107,84 L 145,76 Q 156,62 145,48 Z" fill={bg} />
      <path d="M 100,98 Q 94,110 96,122 Q 100,126 104,122 Q 106,110 100,98 Z" fill={bg} />
      <rect x="75" y="142" width="4" height="54" fill={bg} />
      <rect x="90" y="142" width="4" height="54" fill={bg} />
      <rect x="105" y="142" width="4" height="54" fill={bg} />
      <rect x="120" y="142" width="4" height="54" fill={bg} />
    </svg>
  );
}
