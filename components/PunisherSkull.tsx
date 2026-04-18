export function PunisherSkull() {
  return (
    <div className="skull-wrapper">
      <div className="orbit-ring outer" />
      <div className="orbit-ring" />
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="PUNISHER GAMING skull">
        {/* Skull silhouette — rounded cranium, cheekbone flare, tapered jaw */}
        <path
          d="
            M 45,50
            C 45,14 70,8 100,8
            C 130,8 155,14 155,50
            L 155,76
            Q 153,89 140,96
            Q 156,106 156,118
            Q 152,130 138,138
            L 138,196
            L 62,196
            L 62,138
            Q 48,130 44,118
            Q 44,106 60,96
            Q 47,89 45,76
            Z
          "
          fill="#F0F6FF"
        />

        {/* Left eye — scowl: rounded outer edge, pointed inner corner toward nose */}
        <path
          d="
            M 55,48
            L 89,60
            L 93,84
            L 55,76
            Q 44,62 55,48
            Z
          "
          fill="#030308"
        />

        {/* Right eye — mirror */}
        <path
          d="
            M 145,48
            L 111,60
            L 107,84
            L 145,76
            Q 156,62 145,48
            Z
          "
          fill="#030308"
        />

        {/* Nose — narrow vertical teardrop */}
        <path
          d="
            M 100,98
            Q 94,110 96,122
            Q 100,126 104,122
            Q 106,110 100,98
            Z
          "
          fill="#030308"
        />

        {/* Teeth — 5 thick gaps creating 6 tall teeth */}
        <rect x="75" y="142" width="3.5" height="54" fill="#030308" />
        <rect x="87" y="142" width="3.5" height="54" fill="#030308" />
        <rect x="99" y="142" width="3.5" height="54" fill="#030308" />
        <rect x="111" y="142" width="3.5" height="54" fill="#030308" />
        <rect x="123" y="142" width="3.5" height="54" fill="#030308" />

        {/* Tron cyan scan line */}
        <rect className="scan-line" x="35" y="0" width="130" height="1.5" fill="#00E5FF" opacity="0" />
      </svg>
    </div>
  );
}
