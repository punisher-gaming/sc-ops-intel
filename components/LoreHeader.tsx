"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Minimal header just for the lore subsite. Deliberately different from
// the main Nav — no patch pill, no auth, no music/search floaters. Goal
// is a quiet "reading mode" feel so the comic layout owns the screen.

const LINKS = [
  { href: "/lore", label: "Chronicle" },
  { href: "/lore/races", label: "Species" },
  { href: "/lore/systems", label: "Systems" },
];

export function LoreHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="lore-header">
      <div className="lore-header-inner">
        <Link href="/lore" className="lore-header-brand">
          <span className="lore-header-brand-lore">LORE</span>
          <span className="lore-header-brand-sep">//</span>
          <span className="lore-header-brand-dex">CITIZENDEX</span>
        </Link>
        <nav className="lore-header-links">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={active ? "active" : ""}
              >
                {l.label}
              </Link>
            );
          })}
          {/* Discreet exit back to the main site */}
          <Link href="/" className="lore-header-exit">
            ↩ citizendex.com
          </Link>
        </nav>
        <button
          type="button"
          className="lore-header-hamburger"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? "×" : "≡"}
        </button>
      </div>
      {mobileOpen && (
        <div className="lore-header-drawer">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link href="/" className="lore-header-exit" onClick={() => setMobileOpen(false)}>
            ↩ citizendex.com
          </Link>
        </div>
      )}
    </header>
  );
}
