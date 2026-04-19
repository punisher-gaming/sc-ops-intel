import Link from "next/link";
import { Nav } from "@/components/Nav";
import { StaffCredits } from "@/components/StaffCredits";
import { OwnerNote } from "@/components/OwnerNote";
import { Hologram } from "@/components/Hologram";

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main className="relative min-h-screen">
        <section className="home-hero">
          <div className="brand-mark">
            <div className="brand-frame brand-frame-clean">
              <span className="brand-corner tl" aria-hidden />
              <span className="brand-corner tr" aria-hidden />
              <span className="brand-corner bl" aria-hidden />
              <span className="brand-corner br" aria-hidden />
              <h1
                className="brand-primary brand-wordmark"
                data-text="CITIZENDEX"
              >
                CITIZEN<span className="accent">DEX</span>
              </h1>
            </div>
            <div className="brand-secondary">
              <span className="brand-bar" aria-hidden />
              {/* Hologram-projected subtitle — full Star Wars treatment:
                  cyan tint, scanlines, rolling interference band, flicker. */}
              <Hologram
                stage
                className="hero-hologram"
                style={{
                  fontWeight: 700,
                  padding: "0.4em 0.6em",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  // CSS letter-spacing adds trailing space after the LAST
                  // character; text-indent cancels that so the visible
                  // text reads dead-center.
                  textIndent: "0.28em",
                }}
              >
                THE STAR CITIZEN <span className="accent">//</span> DATABASE
              </Hologram>
              <span className="brand-bar" aria-hidden />
            </div>
          </div>
          <p className="tagline">
            The Star Citizen database. Blueprints, resources, crafting
            recipes, commodities, ships — auto-synced every patch. Save notes.
            Track your fleet. Trade intel.
          </p>
          <div className="cta-row">
            <Link href="/blueprints" className="btn btn-primary">
              Browse Blueprints
            </Link>
            <Link href="/ships" className="btn btn-secondary">
              Browse Ships
            </Link>
          </div>
          {/* Secondary CTA row — supplemental to the main Browse buttons.
              Stacks to a single column on narrow screens. */}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <Link
              href="/new-players"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
                borderRadius: 999,
                fontSize: "0.9rem",
                color: "var(--accent)",
                background: "rgba(77,217,255,0.06)",
                border: "1px solid rgba(77,217,255,0.25)",
                textDecoration: "none",
              }}
            >
              🚀 New to Star Citizen? Start here →
            </Link>
            <Link
              href="/lore"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
                borderRadius: 999,
                fontSize: "0.9rem",
                color: "var(--accent)",
                background: "rgba(77,217,255,0.06)",
                border: "1px solid rgba(77,217,255,0.25)",
                textDecoration: "none",
              }}
            >
              📖 Read the Chronicle · Lore of the Verse →
            </Link>
          </div>
        </section>

        <section className="container-wide" style={{ paddingTop: "2rem" }}>
          <div
            style={{
              display: "grid",
              gap: "0.6rem",
              // Tighter minmax so all six stats fit a single row on any
              // non-phone viewport. 6 × 150px = 900px — fits container-wide
              // without forcing a wrap.
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            }}
          >
            <LiveStat label="Ships" count="295" href="/ships" />
            <LiveStat label="Blueprints" count="1,044" href="/blueprints" />
            <LiveStat label="Resources" count="533" href="/resources" />
            <LiveStat label="Spawn locations" count="1,074" href="/resources" />
            <LiveStat label="Trade locations" count="961" href="/commodities" />
            <LiveStat label="Commodities" count="194" href="/commodities" />
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
              body="1,044 crafting recipes. Filter by type, grade, mission family. Mark ones you own. Click any for materials + sources."
            />
            <FeatureCard
              href="/resources"
              title="Resources"
              body="533 materials with 1,074 spawn locations across Stanton and Pyro. Probabilities pulled from game files."
            />
            <FeatureCard
              href="/crafting"
              title="Crafting"
              body="Fast recipe search. Type what you want to build, get the blueprint with its material chain."
            />
            <FeatureCard
              href="/ships"
              title="Ships"
              body="Every flyable hull. Hull HP, shields, speed, cargo, crew. Sortable, filterable."
            />
          </div>
        </section>

        <section className="container" style={{ paddingTop: "3rem" }}>
          <div className="card" style={{ padding: "2rem" }}>
            <div className="accent-label" style={{ marginBottom: 8 }}>Status</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 16 }}>
              Build progress
            </h2>
            <ul style={{ display: "grid", gap: 10, color: "var(--text-muted)", lineHeight: 1.6, listStyle: "none" }}>
              <StatusLine state="done" label="Ships catalog" detail="295 hulls, searchable, sortable, detail view" />
              <StatusLine state="done" label="Blueprints catalog" detail="1,044 recipes with type + mission-family filters and mark-as-owned" />
              <StatusLine state="done" label="Resources catalog" detail="533 materials + 1,074 spawn locations grouped by system" />
              <StatusLine state="done" label="Crafting search" detail="Fast recipe lookup across all blueprints" />
              <StatusLine state="done" label="Global search (⌘K)" detail="Searches ships + blueprints + resources from any page" />
              <StatusLine state="done" label="Community intel" detail="Logged-in users can submit field reports, moderator approval" />
              <StatusLine state="done" label="Commodities & trade locations" detail="194 commodities + 961 shops; community price submissions live" />
              <StatusLine state="done" label="Weapons & components" detail="Pulled from scunpacked items.json via local Node script; filterable catalogs" />
              <StatusLine state="done" label="Community forum" detail="User-created topics bumped by activity, voting, Discord identities" />
              <StatusLine state="done" label="Site music" detail="Moderator-uploaded tracks, floating player on every page" />
              <StatusLine state="planned" label="Import Hangar" detail="Paste-based RSI fleet import, local parse" />
            </ul>
          </div>
        </section>

        <OwnerNote />
        <StaffCredits />
      </main>
      <footer className="site-footer">
        <div>CITIZENDEX · Unofficial — no affiliation with CIG</div>
        <div style={{ marginTop: 4, fontSize: "0.72rem", color: "var(--text-dim)" }}>
          Hosted by <strong>Punisher Gaming</strong>
        </div>
      </footer>
    </>
  );
}

function LiveStat({ label, count, href }: { label: string; count: string; href: string }) {
  return (
    <Link
      href={href}
      className="card card-hover"
      style={{ padding: "0.75rem 1rem", display: "block", textDecoration: "none" }}
    >
      <div
        style={{
          fontSize: "1.65rem",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--accent)",
          fontFamily: "var(--font-mono)",
          lineHeight: 1,
        }}
      >
        {count}
      </div>
      <div className="label-mini" style={{ marginTop: 5, fontSize: "0.65rem" }}>
        {label}
      </div>
    </Link>
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
