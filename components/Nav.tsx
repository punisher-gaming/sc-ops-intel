"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthButton } from "./AuthButton";
import { CURRENT_PATCH } from "./PatchPill";
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
  { href: "/ask", label: "Ask" },
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
  { href: "/community", label: "Community" },
];

const AUTHED_LINKS: LinkItem[] = [
  { href: "/notes", label: "Notes" },
  { href: "/admin", label: "Admin" },
];

export function Nav() {
  const pathname = usePathname();
  const { user } = useUser();
  const links: NavItem[] = [...PUBLIC_LINKS, ...(user ? AUTHED_LINKS : [])];

  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" className="site-nav-brand">
          <span>
            CITIZEN<span className="accent">DEX</span>
          </span>
        </Link>
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
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}

function NavLink({ item, pathname }: { item: LinkItem; pathname: string | null }) {
  const active = pathname === item.href || pathname?.startsWith(item.href + "/");
  return (
    <Link href={item.href} className={active ? "active" : ""}>
      {item.label}
    </Link>
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
