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
        <div style={{ marginTop: 4, opacity: 0.6, fontSize: "0.7rem" }}>
          All lore is original prose drawn from public sources · Hosted by
          Punisher Gaming · Unofficial, no affiliation with CIG
        </div>
      </footer>
    </>
  );
}
