import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import "./lore.css";

// Lore subsite layout. Uses the main CitizenDex Nav (same as the rest
// of the site) for consistency, then a small lore-specific sub-bar
// below it for jumping between Chronicle / Species / Systems without
// going back to /lore.

export const metadata: Metadata = {
  title: "Lore · CitizenDex",
  description:
    "The Star Citizen chronicle, from the first jump point to the current era. Races, systems, eras, rendered as a scrolling comic.",
};

export default function LoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="lore-body-backdrop" aria-hidden />
      <Nav />
      {/* Lore-specific sub-nav, three pills under the main Nav for easy
          movement between the chronicle landing, species index, and
          systems index from any lore page. */}
      <div className="lore-subnav">
        <div className="lore-subnav-inner">
          <Link href="/lore" className="lore-subnav-brand">
            <span className="lore-subnav-brand-mark">LORE</span>
            <span className="lore-subnav-brand-sep">//</span>
            <span className="lore-subnav-brand-name">THE VERSE</span>
          </Link>
          <nav className="lore-subnav-links" aria-label="Lore sections">
            <Link href="/lore">Chronicle</Link>
            <Link href="/lore/races">Species</Link>
            <Link href="/lore/systems">Systems</Link>
          </nav>
        </div>
      </div>
      <main className="lore-main">{children}</main>
      <footer className="lore-footer">
        <div>Verse Chronicle · CitizenDex</div>
        <div style={{ marginTop: 4, opacity: 0.72, fontSize: "0.72rem", lineHeight: 1.7, maxWidth: "72ch", margin: "4px auto 0" }}>
          All prose is original. Images are courtesy of the{" "}
          <a
            href="https://starcitizen.tools"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--lore-cyan)", textDecoration: "none" }}
          >
            Star Citizen Wiki
          </a>
          {" "}(CC-BY-SA 4.0 community contributions and CIG fan-use art).
          Every image on this site credits its source and links back to the
          wiki page. Art © Cloud Imperium Games Corporation.
        </div>
        <div style={{ marginTop: 6, opacity: 0.55, fontSize: "0.7rem" }}>
          Hosted by Punisher Gaming · Unofficial fan site · No affiliation
          with Cloud Imperium Games
        </div>
      </footer>
    </>
  );
}
