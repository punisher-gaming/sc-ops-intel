import type { Metadata } from "next";
import { LoreHeader } from "@/components/LoreHeader";
import "./lore.css";

// Dedicated layout for the lore subsite. No MusicPlayer / GlobalSearch /
// main Nav — this reads as a standalone "comic" experience tied loosely
// to CitizenDex via the header exit link. When we eventually wire up
// lore.citizendex.com (or verselore.com), this route becomes the site
// root behind that hostname without any code changes.

export const metadata: Metadata = {
  title: "Lore · CitizenDex",
  description:
    "The Star Citizen chronicle, from the first jump point to the current era. Races, systems, eras — rendered as a scrolling comic.",
};

export default function LoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="lore-body-backdrop" aria-hidden />
      <LoreHeader />
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
