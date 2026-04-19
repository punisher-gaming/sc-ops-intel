"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthButton } from "./AuthButton";
import { CURRENT_PATCH } from "./PatchPill";
import { NotificationBell } from "./NotificationBell";
import { useUser } from "@/lib/supabase/hooks";

type LinkItem = { href: string; label: string };
type DropdownItem = {
  label: string;
  // The dropdown is "active" when the current pathname matches any of
  // these prefixes; first one is also where clicking the trigger goes.
  href: string;
  children: LinkItem[];
};
type NavItem = LinkItem | DropdownItem;

function isDropdown(n: NavItem): n is DropdownItem {
  return "children" in n;
}

// Trade dropdown groups Commodities, Trade locations, Refineries to keep
// the nav from sprawling.
const PUBLIC_LINKS: NavItem[] = [
  { href: "/ai", label: "AI" },
  { href: "/blueprints", label: "Blueprints" },
  { href: "/crafting", label: "Crafting" },
  { href: "/resources", label: "Resources" },
  { href: "/ships", label: "Ships" },
  {
    label: "Trade",
    href: "/commodities",
    children: [
      { href: "/commodities", label: "Commodities" },
      { href: "/trade-locations", label: "Trade locations" },
      { href: "/refineries", label: "Refineries" },
    ],
  },
  { href: "/weapons", label: "Weapons" },
  { href: "/components", label: "Components" },
  { href: "/planets", label: "Planets" },
  { href: "/lore", label: "Lore" },
  { href: "/community", label: "Community" },
  // Auction House is its own top-level link with the .nav-holo class for
  // a holographic shimmer — most-promoted destination in the nav.
  { href: "/community/auction", label: "Auction House" },
];

// Notes used to be a top-level nav link. It's been moved into the user
// profile/account area since it's a personal-only page (your own notes,
// not public). Keep Admin at the top for moderators since it gates work.
const AUTHED_LINKS: LinkItem[] = [
  { href: "/admin", label: "Admin" },
];

export function Nav() {
  const pathname = usePathname();
  const { user } = useUser();
  const links: NavItem[] = [...PUBLIC_LINKS, ...(user ? AUTHED_LINKS : [])];

  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open so the page behind
  // doesn't scroll underneath it.
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" className="site-nav-brand">
          <span>
            CITIZEN<span className="accent">DEX</span>
          </span>
        </Link>

        {/* Desktop links — hidden on ≤900px via .site-nav-links CSS below */}
        <div className="site-nav-links">
          {links.map((l) =>
            isDropdown(l) ? (
              <NavDropdown key={l.label} item={l} pathname={pathname} />
            ) : (
              <NavLink key={l.href} item={l} pathname={pathname} />
            ),
          )}
        </div>

        <div className="site-nav-right">
          <span className="site-patch-pill">Patch {CURRENT_PATCH}</span>
          <NotificationBell />
          <AuthButton />
          {/* Hamburger — shown ≤900px only */}
          <button
            type="button"
            className="site-nav-hamburger"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </div>

      {/* Mobile drawer — full-width slide-down, touch-friendly targets */}
      {mobileOpen && (
        <div className="site-nav-drawer" role="menu">
          {links.map((l) =>
            isDropdown(l) ? (
              <MobileDropdown key={l.label} item={l} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            ) : (
              <MobileLink key={l.href} item={l} pathname={pathname} />
            ),
          )}
        </div>
      )}
    </nav>
  );
}

function NavLink({ item, pathname }: { item: LinkItem; pathname: string | null }) {
  const active = pathname === item.href || pathname?.startsWith(item.href + "/");
  // Auction House gets the holographic treatment so it stands out.
  const holo = item.href === "/community/auction";
  const cls = [active ? "active" : "", holo ? "nav-holo" : ""].filter(Boolean).join(" ");
  return (
    <Link href={item.href} className={cls} data-text={holo ? item.label : undefined}>
      {item.label}
    </Link>
  );
}

// Mobile-drawer version of NavLink — bigger padding, full-width, no hover
// tricks (touch devices don't hover).
function MobileLink({ item, pathname }: { item: LinkItem; pathname: string | null }) {
  const active = pathname === item.href || pathname?.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      className="site-nav-drawer-link"
      style={{ color: active ? "var(--accent)" : "var(--text)" }}
    >
      {item.label}
    </Link>
  );
}

function MobileDropdown({
  item,
  pathname,
  onNavigate,
}: {
  item: DropdownItem;
  pathname: string | null;
  onNavigate: () => void;
}) {
  return (
    <div className="site-nav-drawer-group">
      <div className="site-nav-drawer-grouplabel">{item.label}</div>
      {item.children.map((c) => {
        const active = pathname === c.href || pathname?.startsWith(c.href + "/");
        return (
          <Link
            key={c.href}
            href={c.href}
            onClick={onNavigate}
            className="site-nav-drawer-link"
            style={{
              color: active ? "var(--accent)" : "var(--text)",
              paddingLeft: "1.75rem",
              fontSize: "0.95rem",
            }}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}

function NavDropdown({
  item,
  pathname,
}: {
  item: DropdownItem;
  pathname: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open]);

  const active = item.children.some(
    (c) => pathname === c.href || pathname?.startsWith(c.href + "/"),
  );

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={active ? "active" : ""}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "inherit",
          font: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {item.label}
        <span style={{ fontSize: "0.7em", marginTop: 2 }}>▾</span>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 8,
            minWidth: 200,
            padding: 6,
            background: "#0a0e16",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {item.children.map((c) => {
            const childActive = pathname === c.href || pathname?.startsWith(c.href + "/");
            return (
              <Link
                key={c.href}
                href={c.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                style={{
                  padding: "8px 12px",
                  borderRadius: 4,
                  fontSize: "0.875rem",
                  color: childActive ? "var(--accent)" : "var(--text)",
                  background: childActive ? "rgba(77,217,255,0.08)" : "transparent",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!childActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (!childActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
