"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchCommodities,
  fetchCommodity,
  prettyKind,
  uniqueValuesC,
  type Commodity,
} from "@/lib/commodities";
import { CURRENT_PATCH } from "./PatchPill";

const PAGE_SIZE = 50;

export function CommoditiesBrowser() {
  const params = useSearchParams();
  const id = params.get("id");
  if (id) return <CommodityDetail id={id} />;
  return <CommodityList />;
}

function CommodityList() {
  const [rows, setRows] = useState<Commodity[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchCommodities()
      .then(setRows)
      .catch((e) => setErr(e.message ?? String(e)));
  }, []);

  const kinds = useMemo(() => (rows ? uniqueValuesC(rows, "kind") : []), [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const qLower = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind && r.kind !== kind) return false;
      if (qLower) {
        const hay = `${r.name} ${r.code ?? ""} ${r.kind ?? ""}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [rows, q, kind]);

  useEffect(() => setPage(0), [q, kind]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="container-wide">
      <div className="page-header">
        <div className="accent-label">Catalog</div>
        <h1>Commodities</h1>
        <p>
          Tradable goods. Buy/sell prices per terminal are a separate
          dataset (42 MB) we&apos;ll wire in next — for now this is the
          canonical commodity catalog from the game files.{" "}
          <Link href="/trade-locations" style={{ color: "var(--accent)" }}>
            Browse trade locations →
          </Link>
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search commodities…"
          className="input"
          style={{ flex: "1 1 260px", minWidth: 240 }}
        />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="select" style={{ width: 200 }}>
          <option value="">All kinds</option>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {prettyKind(k)}
            </option>
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
        <div>{rows ? `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} commodities` : "…"}</div>
        {pageCount > 1 && (
          <Pager page={page} pageCount={pageCount} setPage={setPage} />
        )}
      </div>

      {err && <ErrorBar text={`Couldn't load commodities: ${err}`} />}
      {!rows && !err && <div style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Loading…</div>}

      {rows && (
        <div className="table-shell">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle("left")}>Name</th>
                <th style={thStyle("left", 140)}>Code</th>
                <th style={thStyle("left", 200)}>Kind</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => (
                <tr key={c.id}>
                  <td style={tdStyle}>
                    <Link href={`/commodities?id=${encodeURIComponent(c.id)}`} style={{ color: "var(--accent)", fontWeight: 500 }}>
                      {c.name}
                    </Link>
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{c.code ?? "—"}</td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{prettyKind(c.kind)}</td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: "3rem 0", textAlign: "center", color: "var(--text-dim)" }}>
                    No commodities match these filters.
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

function CommodityDetail({ id }: { id: string }) {
  const [c, setC] = useState<Commodity | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [raw, setRaw] = useState(false);

  useEffect(() => {
    fetchCommodity(id)
      .then(setC)
      .catch((e) => setErr(e.message ?? String(e)));
  }, [id]);

  if (err) return <div className="container"><ErrorBar text={err} /></div>;
  if (c === undefined)
    return <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>Loading…</div>;
  if (c === null)
    return (
      <div className="container" style={{ paddingTop: "3rem" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ color: "var(--alert)", marginBottom: 12 }}>Commodity not found</div>
          <Link href="/commodities" style={{ color: "var(--accent)" }}>← Back to all commodities</Link>
        </div>
      </div>
    );

  return (
    <div className="container-wide">
      <div style={{ paddingTop: "1.5rem" }}>
        <Link href="/commodities" className="label-mini" style={{ color: "var(--accent)" }}>
          ← All commodities
        </Link>
      </div>
      <div className="page-header">
        <div className="accent-label">{prettyKind(c.kind)}{c.code && ` · ${c.code}`}</div>
        <h1>{c.name}</h1>
        {c.description && (
          <p style={{ marginTop: 8, maxWidth: "68ch" }}>{c.description}</p>
        )}
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 10 }}>Prices &amp; stock</div>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Per-terminal buy/sell prices come from scunpacked&apos;s{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
            commodity_trade_locations.json
          </code>{" "}
          — a 42&nbsp;MB dataset we haven&apos;t ingested yet because it
          needs chunked upload to fit Cloudflare Worker limits. Scheduled for
          the next ingest round.
        </p>
      </div>

      {c.source_data && (
        <div className="card" style={{ padding: "1.5rem", marginTop: "1rem" }}>
          <button
            onClick={() => setRaw((v) => !v)}
            className="btn btn-ghost"
            style={{ height: 32, padding: "0 10px", fontSize: "0.85rem" }}
          >
            {raw ? "▼" : "▶"} Raw source data
          </button>
          {raw && (
            <pre
              style={{
                marginTop: 14,
                padding: "1rem",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                overflowX: "auto",
                maxHeight: 500,
                lineHeight: 1.5,
              }}
            >
              {JSON.stringify(c.source_data, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="label-mini" style={{ marginTop: "2rem", textAlign: "center" }}>
        Last synced{" "}
        {c.last_synced_at
          ? new Date(c.last_synced_at).toISOString().replace("T", " ").slice(0, 19) + " UTC"
          : "—"}
        {" · "}Patch {c.game_version ?? CURRENT_PATCH}
      </div>
    </div>
  );
}

function Pager({ page, pageCount, setPage }: { page: number; pageCount: number; setPage: (n: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        className="btn btn-ghost"
        style={{ height: 28, padding: "0 10px", fontSize: "0.8rem" }}
        disabled={page === 0}
        onClick={() => setPage(Math.max(0, page - 1))}
      >
        ← Prev
      </button>
      <span>Page {page + 1} / {pageCount}</span>
      <button
        className="btn btn-ghost"
        style={{ height: 28, padding: "0 10px", fontSize: "0.8rem" }}
        disabled={page >= pageCount - 1}
        onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
      >
        Next →
      </button>
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
