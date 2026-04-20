"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import {
  BODIES,
  bodiesBySystem,
  getBody,
  weatherIcon,
  weatherTone,
  type CelestialBody,
} from "@/lib/planets";

export default function PlanetsPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="container" style={{ padding: "3rem 1rem" }}>Loading…</div>}>
        <PlanetsRouter />
      </Suspense>
    </PageShell>
  );
}

function PlanetsRouter() {
  const params = useSearchParams();
  const id = params.get("id");
  const body = id ? getBody(id) : null;
  return body ? <PlanetDetail body={body} /> : <PlanetsIndex />;
}

function PlanetsIndex() {
  return (
    <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem" }}>
      <div className="page-header">
        <div className="accent-label">Astrography</div>
        <h1>Planets &amp; moons</h1>
        <p>
          Live weather, gravity, atmosphere, and landing zones for every
          known body in <strong>Stanton</strong> and <strong>Pyro</strong>.
          Click any to plan your next jump.
        </p>
      </div>

      <SystemSection title="Stanton" bodies={bodiesBySystem("Stanton")} />
      <div style={{ height: "2rem" }} />
      <SystemSection title="Pyro" bodies={bodiesBySystem("Pyro")} />
    </div>
  );
}

function SystemSection({ title, bodies }: { title: string; bodies: CelestialBody[] }) {
  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: 12, color: "var(--accent)" }}>
        {title} system
      </h2>
      <div className="planet-grid">
        {bodies.map((b) => (
          <Link
            key={b.slug}
            href={`/planets?id=${encodeURIComponent(b.slug)}`}
            className="card card-hover planet-card"
            style={{ borderLeft: `3px solid ${weatherTone(b.weather)}66` }}
          >
            <div className="planet-card-name">
              <span aria-hidden style={{ marginRight: 6 }}>{weatherIcon(b.weather)}</span>
              {b.name}
            </div>
            <div className="planet-card-meta">
              <span>{b.type === "moon" ? `Moon · ${b.parent}` : b.type[0].toUpperCase() + b.type.slice(1)}</span>
              <span>·</span>
              <span>{b.gravityG.toFixed(2)}g</span>
            </div>
            <div className="planet-card-weather">{b.weatherText}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PlanetDetail({ body }: { body: CelestialBody }) {
  const tone = weatherTone(body.weather);
  return (
    <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem", maxWidth: 920 }}>
      <Link href="/planets" className="label-mini" style={{ color: "var(--accent)" }}>
        ← All planets &amp; moons
      </Link>

      <div className="page-header" style={{ marginTop: 8 }}>
        <div className="accent-label">{body.system} system · {body.type}</div>
        <h1 style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span aria-hidden style={{ color: tone, fontSize: "1.6rem" }}>{weatherIcon(body.weather)}</span>
          {body.name}
        </h1>
        {body.parent && (
          <p style={{ color: "var(--text-dim)" }}>
            Orbiting <Link href={`/planets?id=${encodeURIComponent(body.parent.toLowerCase())}`} style={{ color: "var(--accent)" }}>{body.parent}</Link>
          </p>
        )}
      </div>

      {/* Current weather strip */}
      <div
        className="card"
        style={{
          padding: "1rem 1.25rem",
          borderLeft: `3px solid ${tone}`,
          background: `linear-gradient(90deg, ${tone}11, transparent)`,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div>
          <div className="accent-label">Current conditions</div>
          <div style={{ fontSize: "1.05rem", marginTop: 2, color: tone }}>
            {body.weatherText}
          </div>
        </div>
        <div style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {body.tempC.low}°C low · {body.tempC.high}°C high
        </div>
      </div>

      {/* Stats grid */}
      <div className="planet-detail-grid">
        <Stat label="Atmosphere" value={body.atmosphere} />
        <Stat label="Habitable" value={body.habitable ? "Yes" : "No"} />
        <Stat label="Gravity" value={`${body.gravityG.toFixed(2)} g`} />
        <Stat label="Day length" value={body.dayHours > 0 ? `${body.dayHours} hrs` : ", "} />
        <Stat label="Temp range" value={`${body.tempC.low}° / ${body.tempC.high}°C`} />
        <Stat label="Type" value={body.type[0].toUpperCase() + body.type.slice(1)} />
      </div>

      {/* Blurb */}
      <section style={{ marginTop: "1.75rem" }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 8 }}>Overview</h2>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.65 }}>{body.blurb}</p>
      </section>

      {/* Landing zones */}
      {body.landingZones.length > 0 && (
        <section style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 8 }}>Landing zones &amp; outposts</h2>
          <ul style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", listStyle: "none", padding: 0 }}>
            {body.landingZones.map((lz) => (
              <li
                key={lz}
                className="card"
                style={{ padding: "8px 12px", fontSize: "0.85rem", color: "var(--text-muted)" }}
              >
                {lz}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cross-links */}
      <section style={{ marginTop: "2rem", display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href={`/resources?system=${encodeURIComponent(body.system)}`} className="btn btn-secondary">
          Resources in {body.system}
        </Link>
        <Link href="/planets" className="btn btn-ghost">All bodies</Link>
      </section>

      <p style={{ marginTop: "2rem", fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
        Surface conditions are illustrative, Star Citizen weather and physics are tuned every patch.
        Numbers reflect current scunpacked + Star Citizen Wiki data.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="planet-stat">
      <div className="planet-stat-label">{label}</div>
      <div className="planet-stat-value">{value}</div>
    </div>
  );
}
