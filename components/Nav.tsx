"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "./AuthButton";
import { PunisherSkull } from "./PunisherSkull";
import { CURRENT_PATCH } from "./PatchPill";
import { useUser } from "@/lib/supabase/hooks";

const PUBLIC_LINKS = [
  { href: "/ask", label: "Ask" },
  { href: "/blueprints", label: "Blueprints" },
  { href: "/resources", label: "Resources" },
  { href: "/crafting", label: "Crafting" },
  { href: "/commodities", label: "Commodities" },
  { href: "/trade-locations", label: "Trade" },
  { href: "/ships", label: "Ships" },
  { href: "/weapons", label: "Weapons" },
  { href: "/components", label: "Components" },
  { href: "/community", label: "Community" },
];

const AUTHED_LINKS = [
  { href: "/notes", label: "Notes" },
  { href: "/admin", label: "Admin" },
];

export function Nav() {
  const pathname = usePathname();
  const { user } = useUser();
  const links = [...PUBLIC_LINKS, ...(user ? AUTHED_LINKS : [])];

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
          {links.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + "/");
            return (
              <Link key={l.href} href={l.href} className={active ? "active" : ""}>
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="site-nav-right">
          <span className="site-patch-pill">Patch {CURRENT_PATCH}</span>
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
