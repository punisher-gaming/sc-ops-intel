"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import {
  PROFILES,
  SHIP_HARDPOINTS,
  computeLoadout,
  extractWeaponStats,
  fetchComponentCandidates,
  fetchShipWeaponCandidates,
  shipDefByName,
  type ComponentCategory,
  type ComponentStats,
  type LoadoutResult,
  type ProfileDef,
  type ShipLoadoutDef,
  type WeaponStats,
} from "@/lib/loadouts";

export default function MetaLoadoutsPage() {
  return (
    <PageShell>
      <Suspense fallback={<Loading />}>
        <MetaLoadouts />
      </Suspense>
    </PageShell>
  );
}

function Loading() {
  return (
    <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
      Loading meta loadouts…
    </div>
  );
}

function MetaLoadouts() {
  const params = useSearchParams();
  const debug = params.get("debug") === "1";
  const initialShip = params.get("ship") ?? SHIP_HARDPOINTS[0].shipName;
  const [shipName, setShipName] = useState<string>(initialShip);
  const [profileKey, setProfileKey] = useState<ProfileDef["key"]>("max_dps");
  const [weapons, setWeapons] = useState<WeaponStats[] | null>(null);
  const [components, setComponents] = useState<Map<ComponentCategory, ComponentStats[]> | null>(null);
  const [rawSamples, setRawSamples] = useState<Array<{ name: string; size: number; sd: unknown }>>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchShipWeaponCandidates()
      .then((items) => {
        setWeapons(items.map(extractWeaponStats));
        if (debug) {
          // Show 3 sample weapons' raw source_data so we can see the
          // actual scunpacked schema and refine the extractors.
          const samples = items
            .filter((w) => (w.size ?? 0) >= 2 && (w.size ?? 0) <= 5)
            .slice(0, 3)
            .map((w) => ({ name: w.name, size: w.size ?? 0, sd: w.source_data }));
          setRawSamples(samples);
        }
      })
      .catch((e) => setErr((e as Error).message ?? String(e)));
    // Components run in parallel so the page isn't blocked by either.
    fetchComponentCandidates()
      .then(setComponents)
      .catch(() => { /* leave components null — UI handles gracefully */ });

    // Component debug — fetch raw items separately so we keep the
    // un-extracted source_data for inspection.
    if (debug) {
      import("@/lib/supabase/client").then(({ createClient }) => {
        const c = createClient();
        c.from("components")
          .select("name, size, type, source_data")
          .in("type", ["Shield", "PowerPlant", "Cooler", "QuantumDrive"])
          .gte("size", 1)
          .lte("size", 3)
          .limit(4)
          .then(({ data }) => {
            const extras = ((data ?? []) as Array<{ name: string; size: number; type: string; source_data: unknown }>)
              .map((r) => ({ name: `${r.type}: ${r.name}`, size: r.size, sd: r.source_data }));
            setRawSamples((cur) => [...cur, ...extras]);
          });
      });
    }
  }, [debug]);

  const ship = shipDefByName(shipName) ?? SHIP_HARDPOINTS[0];
  const profile = PROFILES.find((p) => p.key === profileKey)!;
  const loadout: LoadoutResult | null = useMemo(() => {
    if (!weapons) return null;
    return computeLoadout(ship, profile, weapons, components ?? undefined);
  }, [ship, profile, weapons, components]);

  return (
    <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem", maxWidth: 1100 }}>
      <div className="page-header">
        <div className="accent-label">CITIZENDEX RECOMMENDED</div>
        <h1>Meta Loadouts</h1>
        <p>
          Math-optimal weapon picks per ship per build profile. Calculated live
          from our weapon catalog (DPS × fire-rate × projectile speed where
          known) — no hand-waving, no opinion. Community meta drifts with each
          patch and pilot skill matters more than spreadsheet wins.{" "}
          <strong>Use this as a starting point</strong>, then tune to your fly
          style.
        </p>
      </div>

      {/* Coverage notice */}
      <div
        className="card"
        style={{
          padding: "10px 14px",
          marginBottom: 16,
          borderLeft: "3px solid var(--accent)",
          background: "rgba(77,217,255,0.05)",
          fontSize: "0.82rem",
          color: "var(--text-muted)",
          lineHeight: 1.55,
        }}
      >
        🛠 <strong>{SHIP_HARDPOINTS.length} ships covered in v1</strong> — the
        most-played fighters and multicrew picks. Adding more each week as we
        ingest hardpoint data from <a href="https://erkul.games" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>erkul.games</a> and the SC Wiki. Ship not in
        the picker yet? Drop us a note in <Link href="/community" style={{ color: "var(--accent)" }}>Community</Link>.
      </div>

      {/* Ship + profile picker */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "minmax(220px, 320px) 1fr",
          marginBottom: 16,
        }}
      >
        <div>
          <div className="label-mini" style={{ marginBottom: 6 }}>Ship</div>
          <select
            value={shipName}
            onChange={(e) => setShipName(e.target.value)}
            className="select"
          >
            {SHIP_HARDPOINTS.map((s) => (
              <option key={s.shipName} value={s.shipName}>
                {s.manufacturer} {s.shipName}
              </option>
            ))}
          </select>
          <div className="label-mini" style={{ marginTop: 6, color: "var(--text-muted)", textTransform: "none", letterSpacing: 0, fontSize: "0.78rem" }}>
            {ship.blurb}
          </div>
        </div>
        <div>
          <div className="label-mini" style={{ marginBottom: 6 }}>Build profile</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PROFILES.map((p) => {
              const active = p.key === profileKey;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setProfileKey(p.key)}
                  className={active ? "btn btn-primary" : "btn btn-secondary"}
                  style={{ fontSize: "0.82rem", padding: "0 12px", height: 34 }}
                >
                  {p.emoji} {p.label}
                </button>
              );
            })}
          </div>
          <div className="label-mini" style={{ marginTop: 8, color: "var(--text-muted)", textTransform: "none", letterSpacing: 0, fontSize: "0.78rem" }}>
            {profile.blurb}
          </div>
        </div>
      </div>

      {err && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 6,
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.3)",
            color: "var(--alert)",
            fontSize: "0.85rem",
          }}
        >
          Couldn&apos;t load weapon catalog: {err}
        </div>
      )}

      {!err && weapons === null && <Loading />}

      {weapons && (
        <div
          className="label-mini"
          style={{
            marginBottom: 8,
            color: "var(--text-dim)",
            textTransform: "none",
            letterSpacing: 0,
            fontSize: "0.75rem",
          }}
        >
          📊 Catalog: <strong>{weapons.length}</strong> ship-mount weapons,{" "}
          <strong>{weapons.filter((w) => w.dps != null).length}</strong> with full DPS math.{" "}
          Size buckets:{" "}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9]
            .map((s) => `S${s}: ${weapons.filter((w) => w.size === s).length}`)
            .filter((str) => !str.endsWith(": 0"))
            .join(" · ")}
        </div>
      )}

      {loadout && <LoadoutCard result={loadout} />}

      {debug && rawSamples.length > 0 && (
        <div className="card" style={{ padding: "1.25rem", marginTop: 16 }}>
          <div className="accent-label" style={{ marginBottom: 8 }}>🐛 Debug — raw source_data samples</div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginBottom: 12 }}>
            Visible only with <code>?debug=1</code>. Shows the actual jsonb shape so we can see
            which keys hold damage / fire-rate / projectile speed.
          </p>
          {rawSamples.map((s) => (
            <details key={s.name} style={{ marginBottom: 10 }}>
              <summary style={{ cursor: "pointer", color: "var(--accent)", fontSize: "0.9rem" }}>
                {s.name} (S{s.size})
              </summary>
              <pre
                style={{
                  marginTop: 8,
                  padding: 10,
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6,
                  fontSize: "0.7rem",
                  maxHeight: 400,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {JSON.stringify(s.sd, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}

      <p style={{ marginTop: "2rem", fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
        Math-optimal builds are the ceiling, not the rule. Server desync,
        weapon bugs, and pilot skill all influence what actually wins fights.
        Our recommendations refresh every patch as the weapon catalog re-syncs
        from scunpacked. For interactive what-if planning,{" "}
        <a href="https://erkul.games" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>erkul.games</a>{" "}
        remains the gold standard.
      </p>
    </div>
  );
}

function LoadoutCard({ result }: { result: LoadoutResult }) {
  const { ship, profile, slots, components, totals } = result;
  const coverage = totals.filled === totals.total
    ? `${totals.filled}/${totals.total} weapon slots filled`
    : `${totals.filled}/${totals.total} weapon slots filled — some sizes missing from catalog`;
  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div>
          <div className="accent-label">{profile.emoji} {profile.label}</div>
          <h2 style={{ margin: 0, fontSize: "1.4rem" }}>
            {ship.manufacturer} {ship.shipName}
          </h2>
          <div className="label-mini" style={{ marginTop: 4, color: "var(--text-muted)", textTransform: "none", letterSpacing: 0, fontSize: "0.78rem" }}>
            {coverage}
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, fontFamily: "var(--font-mono)", flexWrap: "wrap" }}>
          <Stat label="Total DPS" value={totals.dps.toLocaleString()} accent />
          <Stat label="Total alpha" value={totals.alpha.toLocaleString()} />
          {totals.shieldHp > 0 && <Stat label="Shield HP" value={totals.shieldHp.toLocaleString()} />}
        </div>
      </div>

      {/* Armament */}
      <div className="label-mini" style={{ marginBottom: 8 }}>
        🔫 Armament
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
        {slots.map((slot) => (
          <SlotRow key={slot.hardpoint.id} slot={slot} />
        ))}
      </div>

      {/* Systems */}
      {components.length > 0 && (
        <>
          <div className="label-mini" style={{ marginBottom: 8 }}>
            ⚙ Systems
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {components.map((c) => (
              <ComponentRow key={c.slot.id} choice={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ComponentRow({ choice }: { choice: LoadoutResult["components"][number] }) {
  const { slot, component, reason } = choice;
  const catEmoji = slot.category === "shield" ? "🛡" : slot.category === "powerplant" ? "⚡" : slot.category === "cooler" ? "❄" : "🌀";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(140px, 220px) 1fr auto",
        gap: 12,
        padding: "10px 14px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontSize: "0.92rem", fontWeight: 600 }}>{catEmoji} {slot.label}</div>
        <div className="label-mini" style={{ marginTop: 2 }}>
          S{slot.size} · {slot.category}
        </div>
      </div>
      <div>
        {component ? (
          <>
            <div style={{ fontSize: "0.92rem", color: "var(--accent)", fontWeight: 600 }}>
              {component.name}
            </div>
            <div className="label-mini" style={{ marginTop: 2, color: "var(--text-muted)", textTransform: "none", letterSpacing: 0, fontSize: "0.74rem" }}>
              {component.manufacturer ? `${component.manufacturer} · ` : ""}
              {component.primary != null
                ? `${component.primaryLabel}: ${Math.round(component.primary).toLocaleString()}`
                : `${component.primaryLabel}: stats unavailable`}
              {component.secondary != null && (
                <> · {component.secondaryLabel}: {Math.round(component.secondary).toLocaleString()}</>
              )}
            </div>
            {reason && (
              <div style={{ marginTop: 3, fontSize: "0.7rem", color: "var(--warn)" }}>
                {reason}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontStyle: "italic" }}>
            {reason ?? "No match"}
          </div>
        )}
      </div>
    </div>
  );
}

function SlotRow({ slot }: { slot: LoadoutResult["slots"][number] }) {
  const { hardpoint, weapon, reason } = slot;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(140px, 220px) 1fr auto",
        gap: 12,
        padding: "10px 14px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontSize: "0.92rem", fontWeight: 600 }}>{hardpoint.label}</div>
        <div className="label-mini" style={{ marginTop: 2 }}>
          S{hardpoint.size} · {hardpoint.mount}
        </div>
      </div>
      <div>
        {weapon ? (
          <>
            <div style={{ fontSize: "0.92rem", color: "var(--accent)", fontWeight: 600 }}>
              {weapon.name}
            </div>
            <div className="label-mini" style={{ marginTop: 2, color: "var(--text-muted)", textTransform: "none", letterSpacing: 0, fontSize: "0.74rem" }}>
              {weapon.manufacturer ? `${weapon.manufacturer} · ` : ""}
              {weapon.damageType !== "unknown" ? `${weapon.damageType} · ` : ""}
              {weapon.dps != null ? `${Math.round(weapon.dps)} DPS · ` : ""}
              {weapon.alpha != null ? `${Math.round(weapon.alpha)} alpha` : ""}
              {weapon.dps == null && weapon.alpha == null ? "stats unavailable" : ""}
            </div>
            {reason && (
              <div style={{ marginTop: 3, fontSize: "0.7rem", color: "var(--warn)" }}>
                {reason}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontStyle: "italic" }}>
            {reason ?? "No match"}
          </div>
        )}
      </div>
      {weapon?.projectileSpeed != null && (
        <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-muted)" }}>
          {Math.round(weapon.projectileSpeed)} m/s
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div className="label-mini">{label}</div>
      <div
        style={{
          marginTop: 2,
          fontSize: "1.4rem",
          fontWeight: 700,
          color: accent ? "var(--accent)" : "var(--text)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// Re-export so the picker can show ShipLoadoutDef metadata too if needed.
export type { ShipLoadoutDef };
