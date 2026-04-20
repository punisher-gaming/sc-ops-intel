"use client";

// Tooltip-style hover popup for items (weapons / components / anything
// with a description). Pure CSS hover, no JS state — visible on hover
// of the wrapper, hidden otherwise. Positions to the right of the
// trigger by default; flips to the left on small screens via CSS
// translateX(-100%) when there's no room.

import type { ReactNode } from "react";

interface Props {
  /** The clickable / hoverable label content (usually the item name). */
  children: ReactNode;
  /** Marketing blurb. */
  description?: string | null;
  /** Item Type / Grade / Class / Size / Manufacturer key-value pairs. */
  meta?: Record<string, string>;
}

export function ItemHover({ children, description, meta }: Props) {
  const hasInfo = !!(description || (meta && Object.keys(meta).length > 0));
  if (!hasInfo) return <>{children}</>;
  return (
    <span className="item-hover">
      {children}
      <span className="item-hover-card" role="tooltip">
        {meta && Object.keys(meta).length > 0 && (
          <span className="item-hover-meta">
            {Object.entries(meta).map(([k, v]) => (
              <span key={k} className="item-hover-meta-row">
                <span className="item-hover-meta-key">{k}</span>
                <span className="item-hover-meta-val">{v}</span>
              </span>
            ))}
          </span>
        )}
        {description && (
          <span className="item-hover-desc">{description}</span>
        )}
      </span>
    </span>
  );
}
