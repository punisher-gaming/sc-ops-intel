"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchShip,
  fetchShips,
  formatCrew,
  formatNum,
  shipSize,
  uniqueValues,
  type Ship,
} from "@/lib/ships";
import { CURRENT_PATCH } from "./PatchPill";
import { ItemImage, ItemImageCredit } from "./ItemImage";

const COMPARE_KEY = "sc-ops-intel:compare-ships";

function loadCompare(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function saveCompare(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* quota exceeded, ignore */
  }
}

type SortKey =
  | "name"
  | "manufacturer"
  | "role"
  | "size_class"
  | "hull_hp"
  | "shields_hp"
  | "scm_speed"
  | "cargo_scu";

const PAGE_SIZE = 50;

export function ShipsBrowser() {
  const params = useSearchParams();
  const id = params.get("id");
  if (id) return <ShipDetail id={id} />;
  return <ShipList />;
}

function ShipList() {
  const [rows, setRows] = useState<Ship[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [mfr, setMfr] = useState("");
  const [role, setRole] = useState("");
  const [size, setSize] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [compare, setCompare] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchShips()
      .then(setRows)
      .catch((e) => setErr(e.message ?? String(e)));
    setCompare(loadCompare());
  }, []);

  function toggleCompare(id: string) {
    const next = new Set(compare);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCompare(next);
    saveCompare(next);
  }

  function clearCompare() {
    setCompare(new Set());
    saveCompare(new Set());
  }

  const manufacturers = useMemo(() => (rows ? uniqueValues(rows, "manufacturer") : []), [rows]);
  const roles = useMemo(() => (rows ? uniqueValues(rows, "role") : []), [rows]);
  // Sizes: dedupe by parsed shipSize() since the raw value may be a JSON
  // localization object for some rows
  const sizes = useMemo(() => {
    if (!rows) return [];
    const set = new Set<string>();
    for (const r of rows) {
      const s = shipSize(r);
      if (s && s !== "—") set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const qLower = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (mfr && r.manufacturer !== mfr) return false;
      if (role && r.role !== role) return false;
      if (size && shipSize(r) !== size) return false;
      if (qLower) {
        const hay = `${r.name} ${r.manufacturer ?? ""} ${r.role ?? ""} ${shipSize(r)}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
    const mul = sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
      return String(av).localeCompare(String(bv)) * mul;
    });
    return out;
  }, [rows, q, mfr, role, size, sortKey, sortDir]);

  useEffect(() => setPage(0), [q, mfr, role, size, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir(["hull_hp", "shields_hp", "scm_speed", "cargo_scu"].includes(k) ? "desc" : "asc");
    }
  }

  return (
    <div className="container-wide">
      <div className="page-header">
        <div className="accent-label">Catalog</div>
        <h1>Ships</h1>
        <p>
          Every flyable hull in the &apos;verse — manufacturer, role, size,
          hull HP, shields, speed, cargo, crew. Click any row for full stats.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ships…"
          className="input"
          style={{ flex: "1 1 240px", minWidth: 220 }}
        />
        <select value={mfr} onChange={(e) => setMfr(e.target.value)} className="select" style={{ width: 180 }}>
          <option value="">All manufacturers</option>
          {manufacturers.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="select" style={{ width: 180 }}>
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select value={size} onChange={(e) => setSize(e.target.value)} className="select" style={{ width: 140 }}>
          <option value="">All sizes</option>
          {sizes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          color: "var(--text-dim)",
          fontSize: "0.8rem",
        }}
      >
        <div>{rows ? `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} ships` : "…"}</div>
        {pageCount > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn btn-ghost"
              style={{ height: 28, padding: "0 10px", fontSize: "0.8rem" }}
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← Prev
            </button>
            <span>Page {page + 1} / {pageCount}</span>
            <button
              className="btn btn-ghost"
              style={{ height: 28, padding: "0 10px", fontSize: "0.8rem" }}
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {err && <ErrorBar text={`Couldn't load ships: ${err}`} />}
      {!rows && !err && <div style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Loading…</div>}

      {compare.size > 0 && (
        <div
          style={{
            position: "sticky",
            bottom: 16,
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            marginBottom: 12,
            borderRadius: 8,
            background: "rgba(77,217,255,0.12)",
            border: "1px solid rgba(77,217,255,0.4)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <span style={{ fontWeight: 500 }}>
            {compare.size} ship{compare.size === 1 ? "" : "s"} selected
          </span>
          <Link
            href={`/ships/compare?ids=${Array.from(compare).map(encodeURIComponent).join(",")}`}
            className="btn btn-primary"
            style={{ height: 32, padding: "0 14px", fontSize: "0.85rem" }}
          >
            Compare fleet →
          </Link>
          <button
            type="button"
            onClick={clearCompare}
            className="btn btn-ghost"
            style={{ height: 32, padding: "0 10px", fontSize: "0.8rem", marginLeft: "auto" }}
          >
            Clear
          </button>
        </div>
      )}

      {rows && (
        <div className="table-shell" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th
                  style={{
                    padding: "12px 8px",
                    width: 44,
                    color: "var(--text-dim)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                  }}
                  title="Select for fleet compare"
                >
                  ⇆
                </th>
                <Th k="name" label="Name" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
                <Th k="manufacturer" label="Manufacturer" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={140} />
                <Th k="role" label="Role" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={130} />
                <Th k="size_class" label="Size" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={70} />
                <Th k="hull_hp" label="Hull" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={80} align="right" />
                <Th k="shields_hp" label="Shields" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={90} align="right" />
                <Th k="cargo_scu" label="Cargo" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={80} align="right" />
                <Th k="scm_speed" label="SCM" sortKey={sortKey} dir={sortDir} onClick={toggleSort} width={80} align="right" />
                <th style={thStyle("left", 90)}>Crew</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((s) => (
                <tr key={s.id} style={compare.has(s.id) ? { background: "rgba(77,217,255,0.04)" } : undefined}>
                  <td
                    style={{
                      padding: "14px 8px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      textAlign: "center",
                    }}
                  >
                    <button
                      type="button"
                      aria-label={compare.has(s.id) ? "Remove from fleet compare" : "Add to fleet compare"}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCompare(s.id);
                      }}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 4,
                        border: `1px solid ${compare.has(s.id) ? "var(--accent)" : "rgba(255,255,255,0.2)"}`,
                        background: compare.has(s.id) ? "rgba(77,217,255,0.15)" : "transparent",
                        color: compare.has(s.id) ? "var(--accent)" : "transparent",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      ✓
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <Link href={`/ships?id=${encodeURIComponent(s.id)}`} style={{ color: "var(--accent)", fontWeight: 500 }}>
                      {s.name}
                    </Link>
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{s.manufacturer ?? "—"}</td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{s.role ?? "—"}</td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{shipSize(s)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-mono)" }}>{formatNum(s.hull_hp)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-mono)" }}>{formatNum(s.shields_hp)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-mono)" }}>{formatNum(s.cargo_scu)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-mono)" }}>{formatNum(s.scm_speed)}</td>
                  <td style={{ ...tdStyle, fontFamily: "var(--font-mono)" }}>{formatCrew(s)}</td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: "3rem 0", textAlign: "center", color: "var(--text-dim)" }}>
                    No ships match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ShipDetail({ id }: { id: string }) {
  const [ship, setShip] = useState<Ship | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchShip(id)
      .then(setShip)
      .catch((e) => setErr(e.message ?? String(e)));
  }, [id]);

  if (err) return <div className="container"><ErrorBar text={err} /></div>;
  if (ship === undefined)
    return <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>Loading…</div>;
  if (ship === null)
    return (
      <div className="container" style={{ paddingTop: "3rem" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ color: "var(--alert)", marginBottom: 12 }}>Ship not found</div>
          <Link href="/ships" style={{ color: "var(--accent)" }}>← Back to all ships</Link>
        </div>
      </div>
    );

  return (
    <div className="container-wide">
      <div style={{ paddingTop: "1.5rem" }}>
        <Link href="/ships" className="label-mini" style={{ color: "var(--accent)" }}>
          ← All ships
        </Link>
      </div>

      <div className="page-header">
        <div className="accent-label">
          {ship.manufacturer ?? "Manufacturer unknown"}
          {ship.role && ` · ${ship.role}`}
          {ship.size_class != null && ` · Size ${shipSize(ship)}`}
        </div>
        <h1>{ship.name}</h1>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <ItemImage
          kind="ship"
          candidates={[ship.name]}
          alt={ship.name}
          size={800}
        />
        <ItemImageCredit />
      </div>

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          marginBottom: "1rem",
        }}
      >
        <Stat label="Hull HP" value={formatNum(ship.hull_hp)} />
        <Stat label="Shields HP" value={formatNum(ship.shields_hp)} />
        <Stat label="SCM speed" value={formatNum(ship.scm_speed)} suffix="m/s" />
        <Stat label="Max speed" value={formatNum(ship.max_speed)} suffix="m/s" />
        <Stat label="Cargo" value={formatNum(ship.cargo_scu)} suffix="SCU" />
        <Stat label="Crew" value={formatCrew(ship)} />
      </div>

      {/* Raw source data block removed — jsonb dumps don't belong in the UI. */}

      <div className="label-mini" style={{ marginTop: "2rem", textAlign: "center" }}>
        Last synced{" "}
        {ship.last_synced_at
          ? new Date(ship.last_synced_at).toISOString().replace("T", " ").slice(0, 19) + " UTC"
          : "—"}
        {" · "}
        Patch {ship.game_version ?? CURRENT_PATCH}
      </div>
    </div>
  );
}

function Th({
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

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div className="label-mini" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>
        {value}
        {suffix && value !== "—" && (
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 400, marginLeft: 4 }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
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
