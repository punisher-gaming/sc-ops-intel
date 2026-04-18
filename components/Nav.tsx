"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "./AuthButton";
import { PunisherSkull } from "./PunisherSkull";
import { CURRENT_PATCH } from "./PatchPill";
import { GlobalSearch } from "./GlobalSearch";

const LINKS = [
  { href: "/blueprints", label: "Blueprints" },
  { href: "/resources", label: "Resources" },
  { href: "/crafting", label: "Crafting" },
  { href: "/commodities", label: "Commodities" },
  { href: "/trade-locations", label: "Trade" },
  { href: "/ships", label: "Ships" },
  { href: "/notes", label: "Notes" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" className="site-nav-brand">
          <PunisherSkull size={22} />
          <span>
            SC OPS <span className="accent">INTEL</span>
          </span>
        </Link>
        <div className="site-nav-links">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + "/");
            return (
              <Link key={l.href} href={l.href} className={active ? "active" : ""}>
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="site-nav-right">
          <GlobalSearch />
          <span className="site-patch-pill">Patch {CURRENT_PATCH}</span>
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
