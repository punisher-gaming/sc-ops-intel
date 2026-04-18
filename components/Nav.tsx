import Link from "next/link";
import { AuthButton } from "./AuthButton";

const LINKS = [
  { href: "/ships", label: "Ships" },
  { href: "/weapons", label: "Weapons" },
  { href: "/components", label: "Components" },
  { href: "/blueprints", label: "Blueprints" },
  { href: "/crafting", label: "Crafting" },
  { href: "/resources", label: "Resources" },
  { href: "/commodities", label: "Commodities" },
  { href: "/notes", label: "Notes" },
];

export function Nav() {
  return (
    <nav className="tron-nav">
      <Link href="/" className="tron-wordmark">
        <span className="dot" />
        PUNISHER <span>GAMING</span>
      </Link>
      <ul>
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>{l.label}</Link>
          </li>
        ))}
        <li>
          <AuthButton />
        </li>
      </ul>
    </nav>
  );
}
