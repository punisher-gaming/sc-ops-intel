import Link from "next/link";
import { Nav } from "@/components/Nav";
import { PunisherSkull } from "@/components/PunisherSkull";

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main className="relative min-h-screen">
        <section className="home-hero">
          <div style={{ display: "inline-block", opacity: 0.9 }}>
            <PunisherSkull size={72} />
          </div>
          <h1>
            SC OPS <span className="accent">INTEL</span>
          </h1>
          <p className="tagline">
            Star Citizen operations database. Blueprints, resources, crafting
            recipes, commodities, ships — auto-synced every patch. Save notes.
            Hunt pirates.
          </p>
          <div className="cta-row">
            <Link href="/blueprints" className="btn btn-primary">
              Browse Blueprints
            </Link>
            <Link href="/resources" className="btn btn-secondary">
              Find Resources
            </Link>
          </div>
        </section>

        <section className="container-wide" style={{ paddingTop: "2rem" }}>
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            <FeatureCard
              href="/blueprints"
              title="Blueprints"
              body="Every crafting recipe. Filter by type, grade, manufacturer. See required materials and where to obtain each one."
            />
            <FeatureCard
              href="/resources"
              title="Resources"
              body="Mining yields, harvestables, salvage. Each resource shows every known spawn location across Stanton and Pyro."
            />
            <FeatureCard
              href="/crafting"
              title="Crafting"
              body="Reverse lookup: type what you want, get the full material chain back to raw resources with source locations."
            />
            <FeatureCard
              href="/commodities"
              title="Commodities"
              body="Trade goods, prices by location, shop networks. Plan profitable runs and find stock fast."
            />
          </div>
        </section>

        <section className="container" style={{ paddingTop: "3rem" }}>
          <div className="card" style={{ padding: "2rem" }}>
            <div className="accent-label" style={{ marginBottom: 8 }}>Status</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 16 }}>
              Build progress
            </h2>
            <ul style={{ display: "grid", gap: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>
              <StatusLine state="done" label="Ship data ingested" detail="295 hulls from SC Wiki API" />
              <StatusLine state="active" label="Blueprints & resources" detail="Data pipeline live, UI in progress" />
              <StatusLine state="planned" label="Crafting recipe search" detail="Material chain + source lookup" />
              <StatusLine state="planned" label="Commodity trade routes" detail="Prices per location" />
              <StatusLine state="planned" label="Community field intel" detail="Logged-in users submit, moderators approve" />
              <StatusLine state="planned" label="Import Hangar" detail="Linked RSI profile fleet — coming later" />
            </ul>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        Punisher Gaming · SC OPS INTEL · Unofficial — no affiliation with CIG
      </footer>
    </>
  );
}

function FeatureCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="card card-hover"
      style={{ padding: "1.5rem", display: "block", textDecoration: "none" }}
    >
      <div style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>{body}</div>
      <div style={{ marginTop: 16, color: "var(--accent)", fontSize: "0.8rem", fontWeight: 500 }}>
        Open →
      </div>
    </Link>
  );
}

function StatusLine({
  state,
  label,
  detail,
}: {
  state: "done" | "active" | "planned";
  label: string;
  detail: string;
}) {
  const badgeClass =
    state === "done" ? "badge-success" : state === "active" ? "badge-accent" : "badge-muted";
  const badgeText = state === "done" ? "Live" : state === "active" ? "Building" : "Planned";
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span className={`badge ${badgeClass}`} style={{ minWidth: 64, textAlign: "center" }}>{badgeText}</span>
      <span style={{ color: "var(--text)", fontWeight: 500 }}>{label}</span>
      <span style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>— {detail}</span>
    </li>
  );
}
