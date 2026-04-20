"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchShipsByIds,
  formatCrew,
  formatNum,
  shipDimensions,
  shipSize,
  type Ship,
} from "@/lib/ships";
import { saveFleet } from "@/lib/fleets";
import { useUser } from "@/lib/supabase/hooks";
import { ItemImage } from "./ItemImage";

type SortKey =
  | "name"
  | "manufacturer"
  | "role"
  | "size"
  | "length"
  | "hull_hp"
  | "shields_hp"
  | "cargo_scu"
  | "scm_speed";

// Two view modes:
//   chart - visual to-scale: dark space bg, ships arranged in ascending
//           length order, images sized proportional to length, labels
//           adjacent. Closest thing we can do to the classic SC ship-
//           size comparison chart using wiki images (which aren't all
//           top-down silhouettes, but it gets the point across).
//   list  - straightforward table of selected ships

export function FleetCompare() {
  const params = useSearchParams();
  const idsParam = params.get("ids") ?? "";
  const ids = useMemo(
    () => idsParam.split(",").map((s) => s.trim()).filter(Boolean),
    [idsParam],
  );

  const { user } = useUser();
  const [ships, setShips] = useState<Ship[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"chart" | "list">("chart");
  const [savePrompt, setSavePrompt] = useState(false);
  const [fleetName, setFleetName] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ids.length === 0) {
      setShips([]);
      return;
    }
    fetchShipsByIds(ids)
      .then((rows) => {
        const byId = new Map(rows.map((r) => [r.id, r]));
        setShips(ids.map((id) => byId.get(id)).filter((s): s is Ship => !!s));
      })
      .catch((e) => setErr(e.message ?? String(e)));
  }, [ids]);

  if (err) {
    return (
      <div className="container-wide" style={{ paddingTop: "2rem" }}>
        <ErrorBar text={err} />
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
            tick the ✓ column on any rows, then click &ldquo;Compare fleet&rdquo;
            in the floating bar.
          </p>
        </div>
      </div>
    );
  }

  // Enrich with dimensions, sort ascending by length for the chart view
  const withDims = ships
    .map((s) => ({ ship: s, dims: shipDimensions(s) }))
    .sort((a, b) => (a.dims.length ?? 0) - (b.dims.length ?? 0));
  const maxLength = Math.max(1, ...withDims.map(({ dims }) => dims.length ?? 0));

  return (
    <div className="container-wide">
      <div style={{ paddingTop: "1.5rem" }}>
        <Link href="/ships" className="label-mini" style={{ color: "var(--accent)" }}>
          ← All ships
        </Link>
      </div>

      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}
      >
        <div>
          <div className="accent-label">Fleet</div>
          <h1>Compare {ships.length} ship{ships.length === 1 ? "" : "s"}</h1>
          <p style={{ maxWidth: "56ch" }}>
            {mode === "chart"
              ? `Ships sorted by length, smallest first. Widest ship is ${maxLength.toLocaleString()}m long, everything scales to that.`
              : "Side-by-side stats for your selected ships. Click any column header to sort."}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {user && (
          <button
            type="button"
            onClick={() => setSavePrompt(true)}
            className="btn btn-secondary"
            style={{ height: 32, padding: "0 14px", fontSize: "0.85rem" }}
          >
            Save fleet
          </button>
        )}
        <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            type="button"
            onClick={() => setMode("chart")}
            className={mode === "chart" ? "btn btn-primary" : "btn btn-ghost"}
            style={{ height: 32, padding: "0 14px", fontSize: "0.85rem" }}
          >
            Chart
          </button>
          <button
            type="button"
            onClick={() => setMode("list")}
            className={mode === "list" ? "btn btn-primary" : "btn btn-ghost"}
            style={{ height: 32, padding: "0 14px", fontSize: "0.85rem" }}
          >
            List
          </button>
        </div>
        </div>
      </div>

      {savePrompt && user && (
        <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "1rem" }}>
          <div className="label-mini" style={{ marginBottom: 6 }}>Name this fleet</div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!fleetName.trim()) return;
              setSaving(true);
              setSaveMsg(null);
              try {
                await saveFleet({
                  user_id: user.id,
                  name: fleetName.trim(),
                  ship_ids: ships.map((s) => s.id),
                });
                setSaveMsg(`Saved as "${fleetName.trim()}"`);
                setFleetName("");
                setSavePrompt(false);
                setTimeout(() => setSaveMsg(null), 4000);
              } catch (err) {
                setSaveMsg(`Error: ${(err as Error).message ?? String(err)}`);
              } finally {
                setSaving(false);
              }
            }}
            style={{ display: "flex", gap: 8 }}
          >
            <input
              autoFocus
              value={fleetName}
              onChange={(e) => setFleetName(e.target.value)}
              placeholder="e.g. Mining Squadron Alpha"
              maxLength={100}
              required
              className="input"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={saving || !fleetName.trim()}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSavePrompt(false);
                setFleetName("");
              }}
              className="btn btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
          </form>
          <div className="label-mini" style={{ marginTop: 6 }}>
            Saved fleets show up on your Account page for one-click reload.
          </div>
        </div>
      )}
      {saveMsg && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            background: saveMsg.startsWith("Error") ? "rgba(255,107,107,0.08)" : "rgba(74,222,128,0.08)",
            border: `1px solid ${saveMsg.startsWith("Error") ? "rgba(255,107,107,0.3)" : "rgba(74,222,128,0.3)"}`,
            color: saveMsg.startsWith("Error") ? "var(--alert)" : "var(--success)",
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          {saveMsg}
        </div>
      )}

      {mode === "chart" ? (
        <ChartView withDims={withDims} maxLength={maxLength} />
      ) : (
        <ListView ships={ships} />
      )}
    </div>
  );
}

function ChartView({
  withDims,
  maxLength,
}: {
  withDims: Array<{ ship: Ship; dims: ReturnType<typeof shipDimensions> }>;
  maxLength: number;
}) {
  return (
    <div
      style={{
        padding: "2rem 1.5rem",
        borderRadius: 10,
        // Deep-space gradient + subtle starfield via radial dots
        background:
          "radial-gradient(1200px 800px at 15% 10%, rgba(77,217,255,0.06) 0%, transparent 50%), " +
          "radial-gradient(900px 600px at 85% 90%, rgba(245,185,71,0.04) 0%, transparent 50%), " +
          "#03050a",
        border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Starfield dots */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.3) 50%, transparent), " +
            "radial-gradient(1px 1px at 80% 50%, rgba(255,255,255,0.25) 50%, transparent), " +
            "radial-gradient(1px 1px at 40% 80%, rgba(255,255,255,0.3) 50%, transparent), " +
            "radial-gradient(1px 1px at 60% 20%, rgba(255,255,255,0.2) 50%, transparent), " +
            "radial-gradient(1.5px 1.5px at 90% 10%, rgba(255,255,255,0.4) 50%, transparent)",
          backgroundSize: "400px 400px",
          opacity: 0.6,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 20 }}>
        {withDims.map(({ ship, dims }) => {
          const pct = dims.length ? Math.max(4, (dims.length / maxLength) * 100) : 4;
          return (
            <div
              key={ship.id}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                alignItems: "center",
                gap: 20,
              }}
            >
              {/* Label column, right-aligned against a faint vertical rail */}
              <div
                style={{
                  textAlign: "right",
                  paddingRight: 12,
                  borderRight: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Link
                  href={`/ships?id=${encodeURIComponent(ship.id)}`}
                  style={{ color: "var(--text)", fontSize: "0.9rem", fontWeight: 500 }}
                >
                  {ship.name}
                </Link>
                <div className="label-mini" style={{ marginTop: 2 }}>
                  {dims.length ? `${dims.length}m` : ", "}
                  {ship.manufacturer && ` · ${ship.manufacturer}`}
                </div>
              </div>

              {/* Image sized proportional to ship length */}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    width: `${pct}%`,
                    minWidth: 40,
                    position: "relative",
                  }}
                >
                  <FreeAspectImage name={ship.name} alt={ship.name} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Renders the wiki image without forcing an aspect ratio, the image's
// natural shape shows through, which matches the size-chart vibe better
// than cover-cropping into a 16:10 box.
function FreeAspectImage({ name, alt }: { name: string; alt: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        minHeight: 40,
      }}
    >
      <div style={{ width: "100%" }}>
        <ItemImage candidates={[name]} kind="ship" alt={alt} size={800} />
      </div>
    </div>
  );
}

function ListView({ ships }: { ships: Ship[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("length");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function getSortValue(s: Ship, key: SortKey): string | number | null {
    const d = shipDimensions(s);
    switch (key) {
      case "name": return s.name?.toLowerCase() ?? "";
      case "manufacturer": return (s.manufacturer ?? "").toLowerCase();
      case "role": return (s.role ?? "").toLowerCase();
      case "size": return shipSize(s).toLowerCase();
      case "length": return d.length;
      case "hull_hp": return s.hull_hp;
      case "shields_hp": return s.shields_hp;
      case "cargo_scu": return s.cargo_scu;
      case "scm_speed": return s.scm_speed;
    }
  }

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      // Numeric columns default desc (biggest first); text default asc
      setSortDir(["length", "hull_hp", "shields_hp", "cargo_scu", "scm_speed"].includes(k) ? "desc" : "asc");
    }
  }

  const sorted = [...ships].sort((a, b) => {
    const av = getSortValue(a, sortKey);
    const bv = getSortValue(b, sortKey);
    const mul = sortDir === "asc" ? 1 : -1;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
    return String(av).localeCompare(String(bv)) * mul;
  });

  return (
    <div className="table-shell" style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
        <thead>
          <tr>
            <SortTh k="name" label="Name" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
            <SortTh k="manufacturer" label="Manufacturer" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={150} />
            <SortTh k="role" label="Role" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={130} />
            <SortTh k="size" label="Size" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={90} />
            <SortTh k="length" label="Length" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={90} align="right" />
            <SortTh k="hull_hp" label="Hull" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={90} align="right" />
            <SortTh k="shields_hp" label="Shields" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={90} align="right" />
            <SortTh k="cargo_scu" label="Cargo" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={80} align="right" />
            <SortTh k="scm_speed" label="SCM" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={80} align="right" />
            <th style={thStyle("left", 80)}>Crew</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const d = shipDimensions(s);
            return (
              <tr key={s.id}>
                <td style={tdStyle}>
                  <Link href={`/ships?id=${encodeURIComponent(s.id)}`} style={{ color: "var(--accent)", fontWeight: 500 }}>
                    {s.name}
                  </Link>
                </td>
                <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{s.manufacturer ?? ", "}</td>
                <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{s.role ?? ", "}</td>
                <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{shipSize(s)}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-mono)" }}>{d.length != null ? `${d.length}m` : ", "}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-mono)" }}>{formatNum(s.hull_hp)}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-mono)" }}>{formatNum(s.shields_hp)}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-mono)" }}>{formatNum(s.cargo_scu)}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-mono)" }}>{formatNum(s.scm_speed)}</td>
                <td style={{ ...tdStyle, fontFamily: "var(--font-mono)" }}>{formatCrew(s)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortTh({
  k,
  label,
  sortKey,
  dir,
  onClick,
  width,
  align = "left",
}: {
  k: SortKey;
  label: string;
  sortKey: SortKey;
  dir: "asc" | "desc";
  onClick: (k: SortKey) => void;
  width?: number;
  align?: "left" | "right";
}) {
  const active = sortKey === k;
  return (
    <th
      onClick={() => onClick(k)}
      style={{
        padding: "12px 16px",
        textAlign: align,
        color: active ? "var(--accent)" : "var(--text-dim)",
        fontSize: "0.7rem",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
        userSelect: "none",
        width,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {active && <span style={{ marginLeft: 6 }}>{dir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );
}

function ErrorBar({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 6,
        background: "rgba(255,107,107,0.08)",
        border: "1px solid rgba(255,107,107,0.3)",
        color: "var(--alert)",
        marginBottom: 16,
      }}
    >
      {text}
    </div>
  );
}

function thStyle(align: "left" | "right", width?: number): React.CSSProperties {
  return {
    padding: "12px 16px",
    textAlign: align,
    color: "var(--text-dim)",
    fontSize: "0.7rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    width,
    fontWeight: 500,
    whiteSpace: "nowrap",
  };
}

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  fontSize: "0.875rem",
};
