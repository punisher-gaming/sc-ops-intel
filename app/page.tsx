import Link from "next/link";
import { Nav } from "@/components/Nav";
import { PunisherSkull } from "@/components/PunisherSkull";
import { PatchPill } from "@/components/PatchPill";

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
        <p>Live-extracted blueprint, crafting, resource, and commodity data — auto-synced every patch. Find recipes. Locate materials. Save notes.</p>
        <div className="cta-row">
          <Link href="/blueprints" className="btn btn-primary">Browse Blueprints</Link>
          <Link href="/resources" className="btn btn-secondary">Resource Map</Link>
        </div>
        <div className="ticker">
          <div className="item">SYNC :: <span className="val">4.7.1-LIVE</span></div>
          <div className="item">SOURCES :: <span className="val">SC WIKI // SCUNPACKED // UEX</span></div>
          <div className="item">CRON :: <span className="val">03:00 UTC</span></div>
          <div className="item">STATUS :: <span className="val">BUILDING</span></div>
        </div>
      </section>

      <div className="divider">
        <div className="bar" />
        <div className="label">ROADMAP :: PHASE 3C</div>
        <div className="bar" />
      </div>
      <section className="max-w-[1200px] mx-auto p-8 mb-16">
        <div className="tron-card font-mono text-bone" style={{ fontSize: "1.05rem", lineHeight: 1.9, letterSpacing: "0.06em" }}>
          <div className="text-phosphor mb-3">&gt; priority build order:</div>
          <div className="opacity-90">&gt; 1. BLUEPRINTS :: types, sources, missions, required materials</div>
          <div className="opacity-90">&gt; 2. RESOURCES :: where to mine / harvest / gather each material</div>
          <div className="opacity-90">&gt; 3. CRAFTING :: recipe search → material sources → resource map</div>
          <div className="opacity-90">&gt; 4. COMMODITIES :: trade routes + prices per location</div>
          <div className="opacity-60 mt-3">&gt; 5. WEAPONS / COMPONENTS / SHIPS :: ingested, UI coming after the above</div>
          <div className="opacity-60">&gt; import hangar :: COMING SOON</div>
        </div>
      </section>

      <footer className="tron-footer">
        PUNISHER GAMING // SC OPS INTEL // UNOFFICIAL — NO AFFILIATION WITH CIG
      </footer>
    </>
  );
}
