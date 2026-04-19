// Wraps any children in the OG Star Wars hologram effect — cyan tint,
// CRT scanlines, rolling interference band, subtle flicker + jitter.
// All the heavy lifting lives in globals.css (.hologram + .hologram-stage).
//
// Usage:
//   <Hologram>        ←→ inline projection
//   <Hologram stage>  ←→ adds the projector "cone" beneath
//
// Works with text, images, SVGs — anything you can put inside a <span>.

import type { CSSProperties, ReactNode } from "react";

export function Hologram({
  children,
  stage = false,
  className = "",
  style,
  as = "span",
}: {
  children: ReactNode;
  stage?: boolean;
  className?: string;
  style?: CSSProperties;
  as?: "span" | "div";
}) {
  const Tag = as;
  const inner = (
    <Tag className={`hologram ${className}`} style={style}>
      {children}
    </Tag>
  );
  if (!stage) return inner;
  return <span className="hologram-stage">{inner}</span>;
}
