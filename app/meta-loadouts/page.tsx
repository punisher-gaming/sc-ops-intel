"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { createClient as supabase } from "@/lib/supabase/client";
import { ItemHover } from "@/components/ItemHover";
import {
  PROFILES,
  SHIP_HARDPOINTS,
  computeLoadout,
  extractWeaponStats,
  fetchAllShipDefs,
  fetchComponentCandidates,
  fetchShipWeaponCandidates,
  type ComponentCategory,
  type ComponentStats,
  type LoadoutResult,
  type ProfileDef,
  type ShipDurability,
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
  // All ships with hardpoint/component data — pulled from
  // ships.ship_loadout (ingested from scunpacked-data). Falls back to
  // SHIP_HARDPOINTS if the DB is empty (pre-ingest).
  const [allShips, setAllShips] = useState<ShipLoadoutDef[]>(SHIP_HARDPOINTS);
  useEffect(() => {
    fetchAllShipDefs().then((dbShips) => {
      if (dbShips.length > 0) setAllShips(dbShips);
    });
  }, []);

  // Sort the picker list: manufacturer A→Z, then ship name A→Z within each.
  const sortedShips = useMemo(() => {
    return [...allShips].sort((a, b) => {
      const m = (a.manufacturer || "").localeCompare(b.manufacturer || "");
      return m !== 0 ? m : a.shipName.localeCompare(b.shipName);
    });
  }, [allShips]);

  // Find the currently-selected ship in our merged list.
  const ship = sortedShips.find((s) => s.shipName.toLowerCase() === shipName.toLowerCase()) ?? sortedShips[0];

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
          // Append, don't replace — components may already be in the list.
          setRawSamples((cur) => [...samples, ...cur.filter((c) => !samples.some((s) => s.name === c.name))]);
        }
      })
      .catch((e) => setErr((e as Error).message ?? String(e)));
    // Components run in parallel so the page isn't blocked by either.
    fetchComponentCandidates()
      .then(setComponents)
      .catch(() => { /* leave components null — UI handles gracefully */ });

    // Component debug — pull one of each category. We know from the
    // page that Bolide/AbsoluteZero/CoverAll/Aither were picked, so
    // grab those specifically by name to inspect their schema.
    if (debug) {
      const c = supabase();
      c.from("components")
        .select("name, size, type, source_data")
        .in("name", ["Bolide", "AbsoluteZero", "CoverAll", "Aither"])
        .limit(8)
        .then(({ data, error }) => {
          if (error) {
            console.warn("[meta-loadouts debug] components fetch failed:", error);
            return;
          }
          const extras = ((data ?? []) as Array<{ name: string; size: number; type: string | null; source_data: unknown }>)
            .map((r) => ({
              name: `${r.type ?? "Component"}: ${r.name}`,
              size: r.size,
              sd: r.source_data,
            }));
          console.log("[meta-loadouts debug] component samples:", extras.length, extras.map((e) => e.name));
          setRawSamples((cur) => [...cur, ...extras]);
        });
    }
  }, [debug]);

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
        🛠 <strong>{allShips.length} ships covered</strong> — every flyable
        hull with swappable hardpoints, hardpoint configs ingested from
        scunpacked-data and re-synced each patch. Ship looking weird?
        Drop us a note in <Link href="/community" style={{ color: "var(--accent)" }}>Community</Link>.
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
          <ShipPicker
            ships={sortedShips}
            value={shipName}
            onChange={setShipName}
          />
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

      {weapons && allShips.length > 12 && (
        <CategoryRankings
          ships={allShips}
          weapons={weapons}
          components={components ?? undefined}
          onPick={setShipName}
        />
      )}

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

/** Searchable ship picker — text input + filtered dropdown grouped by
 *  manufacturer. Click an option to select; arrow keys + Enter to
 *  navigate; Esc closes. */
function ShipPicker({
  ships,
  value,
  onChange,
}: {
  ships: ShipLoadoutDef[];
  value: string;
  onChange: (s: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Filter as user types — match against "Manufacturer ShipName".
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ships;
    return ships.filter((s) =>
      `${s.manufacturer} ${s.shipName}`.toLowerCase().includes(q),
    );
  }, [ships, query]);

  // Group by manufacturer for visual scanning.
  const grouped = useMemo(() => {
    const map = new Map<string, ShipLoadoutDef[]>();
    for (const s of filtered) {
      const key = s.manufacturer || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [filtered]);

  // Clamp highlight when filter changes.
  useEffect(() => {
    setHighlight((h) => Math.min(h, Math.max(0, filtered.length - 1)));
  }, [filtered]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(s: ShipLoadoutDef) {
    onChange(s.shipName);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Build a flat-index map so per-row highlighting works inside groups.
  const flatIndex = new Map<string, number>();
  let i = 0;
  for (const s of filtered) {
    flatIndex.set(`${s.manufacturer}-${s.shipName}`, i++);
  }

  // Display value: when not focused, show the currently-selected ship.
  const placeholder = open ? "Type to search 277 ships…" : value;
  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        value={open ? query : ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={placeholder}
        className="input"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 30,
            background: "#0a0e16",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6,
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            padding: 4,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {Array.from(grouped.entries()).map(([mfr, list]) => (
            <div key={mfr}>
              <div
                className="label-mini"
                style={{
                  padding: "8px 10px 4px",
                  color: "var(--accent)",
                  background: "rgba(77,217,255,0.04)",
                  borderRadius: 3,
                  marginTop: 4,
                }}
              >
                {mfr}
              </div>
              {list.map((s) => {
                const idx = flatIndex.get(`${s.manufacturer}-${s.shipName}`) ?? 0;
                const isHighlighted = idx === highlight;
                return (
                  <button
                    key={`${s.manufacturer}-${s.shipName}`}
                    type="button"
                    role="option"
                    aria-selected={isHighlighted}
                    onClick={() => pick(s)}
                    onMouseEnter={() => setHighlight(idx)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 14px",
                      borderRadius: 4,
                      border: "none",
                      background: isHighlighted ? "rgba(77,217,255,0.12)" : "transparent",
                      color: isHighlighted ? "var(--accent)" : "var(--text)",
                      fontSize: "0.88rem",
                      cursor: "pointer",
                    }}
                  >
                    {s.shipName}
                  </button>
                );
              })}
            </div>
          ))}
          <div
            className="label-mini"
            style={{ padding: "6px 10px 4px", color: "var(--text-dim)", textAlign: "center" }}
          >
            ↑↓ to navigate · Enter to pick · Esc closes
          </div>
        </div>
      )}
      {open && filtered.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 30,
            background: "#0a0e16",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6,
            padding: "10px 14px",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
          }}
        >
          No ships match &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}

type MetricKey = "dps" | "alpha" | "shield" | "hull" | "armor" | "ehpEnergy" | "ehpBallistic";

/** Ranked-leaderboard view: pick a ship category (role) + a metric and
 *  see every ship in that category sorted by the metric. Computes the
 *  full math-optimal loadout per ship in-memory. */
function CategoryRankings({
  ships,
  weapons,
  components,
  onPick,
}: {
  ships: ShipLoadoutDef[];
  weapons: WeaponStats[];
  components?: Map<ComponentCategory, ComponentStats[]>;
  onPick: (shipName: string) => void;
}) {
  // Build the category list from ships' blurb (which we populated from
  // ships.role on the DB). Normalize so e.g. "Heavy fighter" and "Heavy
  // Fighter" collapse into one bucket.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of ships) {
      const cat = normalizeCategory(s.blurb);
      if (!cat) continue;
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({ cat, count }));
  }, [ships]);

  const [category, setCategory] = useState<string>(() => categories[0]?.cat ?? "");
  const [metric, setMetric] = useState<MetricKey>("dps");
  const [profileKey, setProfileKey] = useState<ProfileDef["key"]>("max_dps");

  // Default the category to whichever has the most ships once loaded.
  useEffect(() => {
    if (!category && categories.length > 0) {
      setCategory(categories[0].cat);
    }
  }, [categories, category]);

  const profile = PROFILES.find((p) => p.key === profileKey)!;

  const ranked = useMemo(() => {
    if (!category) return [];
    const inCat = ships.filter((s) => normalizeCategory(s.blurb) === category);
    const rows = inCat.map((s) => {
      const r = computeLoadout(s, profile, weapons, components);
      return {
        ship: s,
        dps: r.totals.dps,
        alpha: r.totals.alpha,
        shield: r.totals.shieldHp,
        hull: r.totals.hullHp,
        armor: r.totals.armorHp,
        ehpEnergy: r.totals.ehpEnergy,
        ehpBallistic: r.totals.ehpBallistic,
        weaponSlots: s.hardpoints.length,
      };
    });
    rows.sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0));
    return rows;
  }, [ships, category, weapons, components, profile, metric]);

  if (categories.length === 0) return null;

  return (
    <div className="card" style={{ padding: "1.5rem", marginTop: 24 }}>
      <div className="accent-label">🏆 Category rankings</div>
      <h2 style={{ margin: "4px 0 12px", fontSize: "1.4rem" }}>
        Best {category || "ships"} by metric
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 16, lineHeight: 1.6 }}>
        Computes the full math-optimal loadout for every ship in this category
        and ranks them. Click any ship to load its loadout above.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <div className="label-mini" style={{ marginBottom: 6 }}>Category</div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="select">
            {categories.map(({ cat, count }) => (
              <option key={cat} value={cat}>{cat} ({count})</option>
            ))}
          </select>
        </div>
        <div>
          <div className="label-mini" style={{ marginBottom: 6 }}>Build profile</div>
          <select
            value={profileKey}
            onChange={(e) => setProfileKey(e.target.value as ProfileDef["key"])}
            className="select"
          >
            {PROFILES.map((p) => (
              <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="label-mini" style={{ marginBottom: 6 }}>Rank by</div>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricKey)}
            className="select"
          >
            <option value="dps">🔥 Total DPS</option>
            <option value="alpha">💥 Total alpha</option>
            <option value="shield">🛡 Shield HP</option>
            <option value="hull">🏗 Hull HP</option>
            <option value="armor">🪖 Armor HP</option>
            <option value="ehpEnergy">⚡ EHP vs Energy (tank)</option>
            <option value="ehpBallistic">🔫 EHP vs Ballistic (tank)</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <th style={{ padding: "8px 10px", width: 36 }}>#</th>
              <th style={{ padding: "8px 10px" }}>Ship</th>
              <th style={{ padding: "8px 10px", textAlign: "right" }}>DPS</th>
              <th style={{ padding: "8px 10px", textAlign: "right" }}>Alpha</th>
              <th style={{ padding: "8px 10px", textAlign: "right" }}>Shield</th>
              <th style={{ padding: "8px 10px", textAlign: "right" }}>Hull</th>
              <th style={{ padding: "8px 10px", textAlign: "right" }}>Armor</th>
              <th style={{ padding: "8px 10px", textAlign: "right" }}>EHP⚡</th>
              <th style={{ padding: "8px 10px", textAlign: "right" }}>EHP🔫</th>
            </tr>
          </thead>
          <tbody>
            {ranked.slice(0, 30).map((r, i) => (
              <tr
                key={`${category}::${r.ship.shipName.toLowerCase()}`}
                onClick={() => onPick(r.ship.shipName)}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer",
                }}
              >
                <td style={{ padding: "8px 10px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                <td style={{ padding: "8px 10px" }}>
                  <div style={{ color: "var(--accent)", fontWeight: 600 }}>{r.ship.shipName}</div>
                  <div className="label-mini" style={{ marginTop: 2 }}>{r.ship.manufacturer}</div>
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", color: metric === "dps" ? "var(--accent)" : "var(--text)" }}>
                  {r.dps.toLocaleString()}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", color: metric === "alpha" ? "var(--accent)" : "var(--text)" }}>
                  {r.alpha.toLocaleString()}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", color: metric === "shield" ? "var(--accent)" : "var(--text)" }}>
                  {r.shield > 0 ? r.shield.toLocaleString() : "—"}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", color: metric === "hull" ? "var(--accent)" : "var(--text-muted)" }}>
                  {r.hull > 0 ? r.hull.toLocaleString() : "—"}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", color: metric === "armor" ? "var(--accent)" : "var(--text-muted)" }}>
                  {r.armor > 0 ? r.armor.toLocaleString() : "—"}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", color: metric === "ehpEnergy" ? "var(--accent)" : "var(--text-muted)" }}>
                  {r.ehpEnergy > 0 ? r.ehpEnergy.toLocaleString() : "—"}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", color: metric === "ehpBallistic" ? "var(--accent)" : "var(--text-muted)" }}>
                  {r.ehpBallistic > 0 ? r.ehpBallistic.toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ranked.length > 30 && (
        <div className="label-mini" style={{ marginTop: 10, textAlign: "center" }}>
          Showing top 30 of {ranked.length}
        </div>
      )}
    </div>
  );
}

/** Normalize a wiki "role" string into a clean category name. SC Wiki
 *  returns inconsistent casing + variants (e.g. "Heavy fighter",
 *  "Heavy Fighter", "Heavy-Fighter"). Title-case + collapse spaces. */
function normalizeCategory(blurb: string | null | undefined): string | null {
  if (!blurb) return null;
  const cleaned = blurb.trim();
  if (!cleaned || cleaned.length > 60) return null; // garbage / freeform descriptions
  return cleaned
    .split(/[\s\-_]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
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
          {totals.hullHp > 0 && <Stat label="Hull HP" value={totals.hullHp.toLocaleString()} />}
          {totals.armorHp > 0 && <Stat label="Armor HP" value={totals.armorHp.toLocaleString()} />}
        </div>
      </div>

      {/* Durability strip — effective HP + per-type resists. Lower mult = harder
          to kill against that damage type. */}
      {(totals.ehpEnergy > 0 || totals.ehpBallistic > 0) && (
        <DurabilityStrip
          ehpEnergy={totals.ehpEnergy}
          ehpBallistic={totals.ehpBallistic}
          durability={ship.durability}
        />
      )}

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
              <ItemHover description={component.description} meta={component.meta}>
                {component.name}
              </ItemHover>
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
              <ItemHover description={weapon.description} meta={weapon.meta}>
                {weapon.name}
              </ItemHover>
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

/** Effective-HP + resists strip. Resists are incoming-damage multipliers
 *  in source_data — 0.6 means the hull only takes 60% damage from that
 *  type, which we display as "+67% effective HP" for readability. */
function DurabilityStrip({
  ehpEnergy,
  ehpBallistic,
  durability,
}: {
  ehpEnergy: number;
  ehpBallistic: number;
  durability?: ShipDurability;
}) {
  const r = durability?.resists;
  // multiplier → "X.XX×" and reciprocal "+YY% EHP"
  function fmtResist(mult: number | null): string {
    if (mult == null || mult <= 0) return "—";
    const ehpBoost = (1 / mult - 1) * 100;
    return `${mult.toFixed(2)}× incoming · +${Math.round(ehpBoost)}% EHP`;
  }
  // Hover explainer meta for each card — reuses the ItemHover tooltip
  // system so the UX matches the rest of the site.
  const ENERGY_DESC =
    "EHP = Effective Hit Points: total damage this ship can absorb before it dies, accounting for armor's damage reduction. Energy weapons = lasers, plasma, neutron cannons. Math: shield + (hull ÷ energy multiplier) + armor. A 0.60× multiplier means the hull shrugs off 40% of laser damage, so its hull HP is effectively 1.67× its raw value vs energy.";
  const BALLISTIC_DESC =
    "EHP = Effective Hit Points: total damage this ship can absorb before it dies. Ballistic weapons = gatlings, repeaters, cannons (kinetic damage — finite ammo but punches harder per shot). Math: shield + (hull ÷ physical multiplier) + armor. Lower multiplier = harder to crack with bullets.";
  const THERMAL_DESC =
    "Thermal damage = heat-based weapons + your own ship overheating in a long fight. The multiplier scales incoming thermal damage: 1.00× = full damage taken, lower = resistant. Most hulls are neutral (1.00×) here — true thermal-resistant hulls are rare.";
  const DISTORTION_DESC =
    "Distortion = EMP-style damage that knocks out ship systems (power plant, quantum drive, weapons) instead of destroying the hull. A distortion-resistant hull stays online longer under suppression fire. The multiplier scales incoming distortion: 1.00× = standard, lower = more resistant.";

  function ResistCard({
    label,
    ehp,
    resist,
    desc,
    emphasis,
  }: {
    label: string;
    ehp?: number;
    resist: number | null;
    desc: string;
    emphasis?: boolean;
  }) {
    return (
      <ItemHover description={desc} meta={{ "Incoming multiplier": resist != null ? `${resist.toFixed(2)}×` : "—" }}>
        <span style={{ display: "block", cursor: "help" }}>
          <span className="label-mini" style={{ display: "block" }}>{label}</span>
          {ehp != null && (
            <span style={{ display: "block", marginTop: 2, fontSize: "1.1rem", fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
              {ehp.toLocaleString()}
            </span>
          )}
          <span style={{ display: "block", fontSize: ehp != null ? "0.7rem" : "0.85rem", color: ehp != null ? "var(--text-dim)" : "var(--text-muted)", marginTop: 2, fontFamily: ehp == null ? "var(--font-mono)" : undefined }}>
            {fmtResist(resist)}
          </span>
        </span>
      </ItemHover>
    );
  }

  return (
    <div
      style={{
        marginBottom: 18,
        padding: "10px 14px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: 14,
      }}
    >
      <ResistCard label="⚡ EHP vs Energy" ehp={ehpEnergy} resist={r?.energy ?? null} desc={ENERGY_DESC} emphasis />
      <ResistCard label="🔫 EHP vs Ballistic" ehp={ehpBallistic} resist={r?.physical ?? null} desc={BALLISTIC_DESC} emphasis />
      <ResistCard label="🔥 Thermal resist" resist={r?.thermal ?? null} desc={THERMAL_DESC} />
      <ResistCard label="🌀 Distortion resist" resist={r?.distortion ?? null} desc={DISTORTION_DESC} />
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
