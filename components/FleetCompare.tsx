"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchShipsByIds,
  formatCrew,
  formatNum,
  shipDimensions,
  type Ship,
} from "@/lib/ships";
import { ItemImage } from "./ItemImage";

// Fleet-to-scale comparison. Reads ?ids=a,b,c from URL. Fetches those ships,
// grabs their length from source_data.sizes.length, then renders each
// horizontally scaled to the longest ship in the selection. A meter ruler
// runs below so the relative sizes read instantly.

export function FleetCompare() {
  const params = useSearchParams();
  const idsParam = params.get("ids") ?? "";
  const ids = useMemo(
    () => idsParam.split(",").map((s) => s.trim()).filter(Boolean),
    [idsParam],
  );

  const [ships, setShips] = useState<Ship[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) {
      setShips([]);
      return;
    }
    fetchShipsByIds(ids)
      .then((rows) => {
        // Preserve the order the user selected in
        const byId = new Map(rows.map((r) => [r.id, r]));
        setShips(ids.map((id) => byId.get(id)).filter((s): s is Ship => !!s));
      })
      .catch((e) => setErr(e.message ?? String(e)));
  }, [ids]);

  if (err) {
    return (
      <div className="container-wide" style={{ paddingTop: "2rem" }}>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 6,
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.3)",
            color: "var(--alert)",
          }}
        >
          {err}
        </div>
      </div>
    );
  }

  if (!ships) {
    return (
      <div className="container-wide" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
        Loading…
      </div>
    );
  }

  if (ships.length === 0) {
    return (
      <div className="container-wide" style={{ paddingTop: "3rem" }}>
        <div className="page-header">
          <div className="accent-label">Fleet</div>
          <h1>Compare ships</h1>
          <p>
            No ships selected. Go to{" "}
            <Link href="/ships" style={{ color: "var(--accent)" }}>Ships</Link>,
            tick the ✓ column on any rows, then click &ldquo;Compare fleet&rdquo; in the
            floating bar.
          </p>
        </div>
      </div>
    );
  }

  const withDims = ships.map((s) => ({
    ship: s,
    dims: shipDimensions(s),
  }));
  const maxLength = Math.max(
    1,
    ...withDims.map(({ dims }) => dims.length ?? 0),
  );

  // Round the ruler to a "nice" meter increment so the ticks are readable.
  const tickStep = pickTickStep(maxLength);

  return (
    <div className="container-wide">
      <div style={{ paddingTop: "1.5rem" }}>
        <Link href="/ships" className="label-mini" style={{ color: "var(--accent)" }}>
          ← All ships
        </Link>
      </div>
      <div className="page-header">
        <div className="accent-label">Fleet · to scale</div>
        <h1>Compare {ships.length} ship{ships.length === 1 ? "" : "s"}</h1>
        <p>
          Each ship is drawn at its real in-game length, scaled against the
          longest ship in your selection ({maxLength.toLocaleString()}m).
        </p>
      </div>

      {/* Scale ruler */}
      <div
        className="card"
        style={{
          padding: "1rem 1.25rem",
          marginBottom: "1rem",
          overflowX: "auto",
        }}
      >
        <div className="label-mini" style={{ marginBottom: 10 }}>
          Scale · each tick = {tickStep}m
        </div>
        <div style={{ position: "relative", height: 14, marginBottom: 20 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 6,
              height: 1,
              background: "rgba(255,255,255,0.15)",
            }}
          />
          {tickMarks(maxLength, tickStep).map((m) => (
            <div
              key={m}
              style={{
                position: "absolute",
                left: `${(m / maxLength) * 100}%`,
                top: 0,
                width: 1,
                height: 14,
                background: "rgba(255,255,255,0.3)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: -20,
                  width: 40,
                  textAlign: "center",
                  color: "var(--text-dim)",
                  fontSize: "0.65rem",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {m}
              </div>
            </div>
          ))}
        </div>

        {/* Scaled image rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
          {withDims.map(({ ship, dims }) => {
            const pct = dims.length ? (dims.length / maxLength) * 100 : 0;
            return (
              <div key={ship.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 160,
                    minWidth: 160,
                    fontSize: "0.85rem",
                    fontWeight: 500,
                  }}
                >
                  <Link href={`/ships?id=${encodeURIComponent(ship.id)}`} style={{ color: "var(--accent)" }}>
                    {ship.name}
                  </Link>
                  <div className="label-mini" style={{ marginTop: 2 }}>
                    {dims.length ? `${dims.length}m long` : "no length data"}
                  </div>
                </div>
                <div style={{ flex: 1, position: "relative" }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      minWidth: 2,
                      height: 48,
                      borderRadius: 4,
                      overflow: "hidden",
                      background: "rgba(77,217,255,0.05)",
                      border: "1px solid rgba(77,217,255,0.25)",
                    }}
                  >
                    <ScaledShipImage name={ship.name} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats matrix */}
      <div className="card" style={{ padding: "1.25rem 1.5rem", overflowX: "auto" }}>
        <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 12 }}>Stats</div>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr>
              <th style={mxTh()}>Stat</th>
              {ships.map((s) => (
                <th key={s.id} style={mxTh()}>
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Length (m)" values={withDims.map((w) => w.dims.length)} formatter={(v) => (v == null ? "—" : `${v}`)} />
            <Row label="Beam (m)" values={withDims.map((w) => w.dims.beam)} formatter={(v) => (v == null ? "—" : `${v}`)} />
            <Row label="Height (m)" values={withDims.map((w) => w.dims.height)} formatter={(v) => (v == null ? "—" : `${v}`)} />
            <Row label="Manufacturer" values={ships.map((s) => s.manufacturer)} formatter={(v) => v ?? "—"} />
            <Row label="Role" values={ships.map((s) => s.role)} formatter={(v) => v ?? "—"} />
            <Row label="Size class" values={ships.map((s) => s.size_class)} formatter={(v) => v ?? "—"} />
            <Row label="Hull HP" values={ships.map((s) => s.hull_hp)} formatter={(v) => formatNum(v)} />
            <Row label="Shields HP" values={ships.map((s) => s.shields_hp)} formatter={(v) => formatNum(v)} />
            <Row label="Cargo (SCU)" values={ships.map((s) => s.cargo_scu)} formatter={(v) => formatNum(v)} />
            <Row label="SCM (m/s)" values={ships.map((s) => s.scm_speed)} formatter={(v) => formatNum(v)} />
            <Row label="Max (m/s)" values={ships.map((s) => s.max_speed)} formatter={(v) => formatNum(v)} />
            <Row
              label="Crew"
              values={ships.map((s) => s)}
              formatter={(v) => (v ? formatCrew(v as Ship) : "—")}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row<T>({
  label,
  values,
  formatter,
}: {
  label: string;
  values: T[];
  formatter: (v: T) => string;
}) {
  return (
    <tr>
      <td style={{ ...mxTd(), color: "var(--text-dim)", whiteSpace: "nowrap" }}>{label}</td>
      {values.map((v, i) => (
        <td key={i} style={{ ...mxTd(), fontFamily: typeof v === "number" ? "var(--font-mono)" : undefined }}>
          {formatter(v)}
        </td>
      ))}
    </tr>
  );
}

function ScaledShipImage({ name }: { name: string }) {
  // Uses the wiki image if we can find it, otherwise a cyan bar
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ItemImage candidates={[name]} kind="ship" alt={name} size={800} />
    </div>
  );
}

function pickTickStep(max: number): number {
  // Aim for ~6–10 ticks total
  const steps = [5, 10, 25, 50, 100, 200, 500, 1000, 2000];
  for (const s of steps) {
    if (max / s <= 10) return s;
  }
  return steps[steps.length - 1];
}

function tickMarks(max: number, step: number): number[] {
  const out: number[] = [];
  for (let v = 0; v <= max; v += step) out.push(v);
  return out;
}

function mxTh(): React.CSSProperties {
  return {
    padding: "10px 12px",
    textAlign: "left",
    color: "var(--text-dim)",
    fontSize: "0.7rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontWeight: 500,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    whiteSpace: "nowrap",
  };
}
function mxTd(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    fontSize: "0.85rem",
  };
}
