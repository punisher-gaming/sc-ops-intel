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
        <p>Live-extracted ship, weapon, component, blueprint, and crafting data — auto-synced every patch. Build loadouts. Save notes. Hunt pirates.</p>
        <div className="cta-row">
          <Link href="/ships" className="btn btn-primary">Browse Database</Link>
          <a href="https://robertsspaceindustries.com/orgs/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Join Org</a>
        </div>
        <div className="ticker">
          <div className="item">SYNC :: <span className="val">4.7.1-LIVE</span></div>
          <div className="item">ENTITIES :: <span className="val">14,237</span></div>
          <div className="item">MEMBERS :: <span className="val">342</span></div>
          <div className="item">UPTIME :: <span className="val">99.9%</span></div>
        </div>
      </section>

      <div className="divider">
        <div className="bar" />
        <div className="label">SAMPLE ENTITY :: SHIP</div>
        <div className="bar" />
      </div>
      <section className="max-w-[1200px] mx-auto p-8">
        <div className="tron-card">
          <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
            <div>
              <div className="font-display text-4xl font-bold" style={{ textShadow: "0 0 12px rgba(0,229,255,0.4)" }}>F7A MK II HORNET</div>
              <div className="font-mono text-phosphor mt-2" style={{ letterSpacing: "0.22em" }}>ANVIL AEROSPACE</div>
            </div>
            <div className="font-mono border border-magenta px-3 py-1 text-magenta" style={{ letterSpacing: "0.2em" }}>UPDATED 4.7.1</div>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <Stat label="HULL" value="24,500" unit="HP" />
            <Stat label="SHIELDS" value="18,000" unit="HP" hot />
            <Stat label="SCM SPEED" value="218" unit="m/s" />
            <Stat label="MAX SPEED" value="1,240" unit="m/s" />
            <Stat label="CARGO" value="2" unit="SCU" />
            <Stat label="CREW" value="1" />
            <Stat label="SIZE" value="S2" />
            <Stat label="ROLE" value="MIL. FIGHTER" small />
          </div>
        </div>
      </section>

      <div className="divider">
        <div className="bar" />
        <div className="label">PHASE 2 :: IN PROGRESS</div>
        <div className="bar" />
      </div>
      <section className="max-w-[1200px] mx-auto p-8 mb-16">
        <div className="tron-card font-mono text-bone" style={{ fontSize: "1.1rem", lineHeight: 1.8, letterSpacing: "0.06em" }}>
          <div className="text-phosphor mb-4">&gt; login, notes, crafting recipes, and RSI handle linking shipping next</div>
          <div className="opacity-60">&gt; import hangar :: COMING SOON</div>
          <div className="opacity-60">&gt; data ingest from SC Wiki API :: Phase 3</div>
        </div>
      </section>

      <footer className="tron-footer">
        PUNISHER GAMING // SC OPS INTEL // UNOFFICIAL — NO AFFILIATION WITH CIG
      </footer>
    </>
  );
}

function Stat({ label, value, unit, hot, small }: { label: string; value: string; unit?: string; hot?: boolean; small?: boolean }) {
  return (
    <div className="p-4 border" style={{ borderColor: "rgba(0,229,255,0.18)", background: "rgba(10,22,40,0.45)" }}>
      <div className="font-mono mb-1" style={{ color: hot ? "var(--amber)" : "rgba(0,229,255,0.85)", letterSpacing: "0.22em", fontSize: "0.95rem" }}>{label}</div>
      <div className="font-stat font-bold" style={{ fontSize: small ? "1.1rem" : "1.5rem", color: hot ? "var(--amber)" : "var(--bone)", textShadow: hot ? "0 0 10px var(--amber)" : undefined }}>
        {value}
        {unit && <span className="ml-1 font-normal opacity-50" style={{ fontSize: "0.85rem" }}>{unit}</span>}
      </div>
    </div>
  );
}
