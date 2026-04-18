import Link from "next/link";
import { Nav } from "@/components/Nav";
import { PunisherSkull } from "@/components/PunisherSkull";
import { PatchPill } from "@/components/PatchPill";
import { TopShipsLive } from "@/components/TopShipsLive";

export default function LandingPage() {
  return (
    <>
      <Nav />
      <PatchPill />

      <section className="hero">
        <div className="grid-floor" />
        <div className="horizon-glow" />
        <PunisherSkull />
        <h1>SC OPS <span className="accent">//</span> INTEL</h1>
        <div className="tag">PUNISHER GAMING :: STAR CITIZEN DATABASE</div>
        <p>Live-extracted ship, weapon, component, blueprint, and crafting data — auto-synced every patch. Build loadouts. Save notes. Hunt pirates.</p>
        <div className="cta-row">
          <Link href="/ships" className="btn btn-primary">Browse Database</Link>
          <a href="https://robertsspaceindustries.com/orgs/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Join Org</a>
        </div>
        <div className="ticker">
          <div className="item">SYNC :: <span className="val">4.7.1-LIVE</span></div>
          <div className="item">SHIPS :: <span className="val">295</span></div>
          <div className="item">CRON :: <span className="val">03:00 UTC</span></div>
          <div className="item">SOURCE :: <span className="val">SC WIKI API</span></div>
        </div>
      </section>

      <div className="divider">
        <div className="bar" />
        <div className="label">FLAGSHIP HULLS :: LIVE</div>
        <div className="bar" />
      </div>
      <section className="max-w-[1400px] mx-auto p-8">
        <TopShipsLive />
        <div className="mt-6 text-center">
          <Link href="/ships" className="btn btn-secondary">BROWSE ALL SHIPS →</Link>
        </div>
      </section>

      <div className="divider">
        <div className="bar" />
        <div className="label">PHASE 3 :: SHIPS LIVE // WEAPONS + COMPONENTS NEXT</div>
        <div className="bar" />
      </div>
      <section className="max-w-[1200px] mx-auto p-8 mb-16">
        <div className="tron-card font-mono text-bone" style={{ fontSize: "1.1rem", lineHeight: 1.8, letterSpacing: "0.06em" }}>
          <div className="text-phosphor mb-4">&gt; ships catalog live — 295 hulls ingested from SC Wiki API</div>
          <div className="opacity-70">&gt; weapons, components, commodities, blueprints, resources, crafting :: in progress</div>
          <div className="opacity-60">&gt; import hangar :: COMING SOON</div>
        </div>
      </section>

      <footer className="tron-footer">
        PUNISHER GAMING // SC OPS INTEL // UNOFFICIAL — NO AFFILIATION WITH CIG
      </footer>
    </>
  );
}
