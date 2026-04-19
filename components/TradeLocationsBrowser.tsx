"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchTradeLocation,
  fetchTradeLocations,
  prettyKind,
  uniqueValuesT,
  type TradeLocation,
} from "@/lib/commodities";
import { CURRENT_PATCH } from "./PatchPill";
import { AvailabilityList } from "./AvailabilityList";
import { TradeLocationPrices } from "./TradeLocationPrices";

const PAGE_SIZE = 50;

export function TradeLocationsBrowser() {
  const params = useSearchParams();
  const id = params.get("id");
  if (id) return <TradeLocationDetail id={id} />;
  return <TradeLocationList />;
}

function TradeLocationList() {
  const [rows, setRows] = useState<TradeLocation[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [system, setSystem] = useState("");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchTradeLocations()
      .then(setRows)
      .catch((e) => setErr(e.message ?? String(e)));
  }, []);

  const systems = useMemo(() => (rows ? uniqueValuesT(rows, "system") : []), [rows]);
  const kinds = useMemo(() => (rows ? uniqueValuesT(rows, "kind") : []), [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const qLower = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (system && r.system !== system) return false;
      if (kind && r.kind !== kind) return false;
      if (qLower) {
        const hay = `${r.name} ${r.system ?? ""} ${r.planet ?? ""} ${r.place ?? ""} ${r.kind ?? ""}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [rows, q, system, kind]);

  useEffect(() => setPage(0), [q, system, kind]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="container-wide">
      <div className="page-header">
        <div className="accent-label">Catalog</div>
        <h1>Trade locations</h1>
        <p>
          Every shop, commodity terminal, refuel stop, and manufacturing
          facility in the game. Filter by system or type.{" "}
          <Link href="/commodities" style={{ color: "var(--accent)" }}>
            Browse commodities →
          </Link>
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search trade locations…"
          className="input"
          style={{ flex: "1 1 260px", minWidth: 240 }}
        />
        <select value={system} onChange={(e) => setSystem(e.target.value)} className="select" style={{ width: 180 }}>
          <option value="">All systems</option>
          {systems.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="select" style={{ width: 180 }}>
          <option value="">All kinds</option>
          {kinds.map((k) => (
            <option key={k} value={k}>{prettyKind(k)}</option>
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
        <div>{rows ? `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} locations` : "…"}</div>
        {pageCount > 1 && <Pager page={page} pageCount={pageCount} setPage={setPage} />}
      </div>

      {err && <ErrorBar text={`Couldn't load trade locations: ${err}`} />}
      {!rows && !err && <div style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Loading…</div>}

      {rows && (
        <div className="table-shell">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle("left")}>Name</th>
                <th style={thStyle("left", 120)}>System</th>
                <th style={thStyle("left", 120)}>Planet</th>
                <th style={thStyle("left", 140)}>Kind</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((t) => (
                <tr key={t.id}>
                  <td style={tdStyle}>
                    <Link href={`/trade-locations?id=${encodeURIComponent(t.id)}`} style={{ color: "var(--accent)", fontWeight: 500 }}>
                      {t.name}
                    </Link>
                    {t.place && (
                      <div style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                        {t.place}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{t.system ?? "—"}</td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{t.planet ?? "—"}</td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{prettyKind(t.kind)}</td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "3rem 0", textAlign: "center", color: "var(--text-dim)" }}>
                    No trade locations match these filters.
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

function TradeLocationDetail({ id }: { id: string }) {
  const [t, setT] = useState<TradeLocation | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchTradeLocation(id)
      .then(setT)
      .catch((e) => setErr(e.message ?? String(e)));
  }, [id]);

  if (err) return <div className="container"><ErrorBar text={err} /></div>;
  if (t === undefined)
    return <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>Loading…</div>;
  if (t === null)
    return (
      <div className="container" style={{ paddingTop: "3rem" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ color: "var(--alert)", marginBottom: 12 }}>Trade location not found</div>
          <Link href="/trade-locations" style={{ color: "var(--accent)" }}>← Back to all trade locations</Link>
        </div>
      </div>
    );

  return (
    <div className="container-wide">
      <div style={{ paddingTop: "1.5rem" }}>
        <Link href="/trade-locations" className="label-mini" style={{ color: "var(--accent)" }}>
          ← All trade locations
        </Link>
      </div>
      <div className="page-header">
        <div className="accent-label">
          {t.system ?? "Unknown system"}
          {t.planet && ` · ${t.planet}`}
          {t.kind && ` · ${prettyKind(t.kind)}`}
        </div>
        <h1>{t.name}</h1>
        {t.place && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-dim)" }}>
            {t.place}
          </p>
        )}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <div className="accent-label" style={{ marginBottom: 10 }}>Inventory</div>
        <AvailabilityList locationId={t.id} />
      </div>

      <TradeLocationPrices locationId={t.id} locationName={t.name} />

      {/* Raw source data block removed — jsonb dumps don't belong in the UI. */}

      <div className="label-mini" style={{ marginTop: "2rem", textAlign: "center" }}>
        Last synced{" "}
        {t.last_synced_at
          ? new Date(t.last_synced_at).toISOString().replace("T", " ").slice(0, 19) + " UTC"
          : "—"}
        {" · "}Patch {t.game_version ?? CURRENT_PATCH}
      </div>
    </div>
  );
}

function Pager({ page, pageCount, setPage }: { page: number; pageCount: number; setPage: (n: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button className="btn btn-ghost" style={{ height: 28, padding: "0 10px", fontSize: "0.8rem" }} disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))}>← Prev</button>
      <span>Page {page + 1} / {pageCount}</span>
      <button className="btn btn-ghost" style={{ height: 28, padding: "0 10px", fontSize: "0.8rem" }} disabled={page >= pageCount - 1} onClick={() => setPage(Math.min(pageCount - 1, page + 1))}>Next →</button>
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
  };
}

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  fontSize: "0.875rem",
};
