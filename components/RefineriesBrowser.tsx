"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prettyKind, type TradeLocation } from "@/lib/commodities";
import { tokenMatch } from "@/lib/search";

// Refineries are a subset of trade_locations whose class name contains
// "Refin". Includes both the Stanton Refinery Wings (DC_*_RefineryWing)
// and the Pyro orbital refineries (RestStop_Pyro_*_Refin).

const T_COLS =
  "id, name, system, planet, place, operator, kind, game_version, last_synced_at, source_data";

async function fetchRefineries(): Promise<TradeLocation[]> {
  const client = createClient();
  // Filter on the original ClassName stored in source_data jsonb.
  // ilike with %Refin% covers RefineryWing + Refin suffixes.
  const { data, error } = await client
    .from("trade_locations")
    .select(T_COLS)
    .ilike("source_data->>ClassName", "%Refin%")
    .order("name", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as TradeLocation[];
}

// Fall back to a name match if the source_data path query returns nothing
// (in case the source_data shape differs).
async function fetchRefineriesFallback(): Promise<TradeLocation[]> {
  const client = createClient();
  const { data, error } = await client
    .from("trade_locations")
    .select(T_COLS)
    .ilike("name", "%refin%")
    .order("name", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as TradeLocation[];
}

export function RefineriesBrowser() {
  const [rows, setRows] = useState<TradeLocation[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [system, setSystem] = useState("");

  useEffect(() => {
    fetchRefineries()
      .then(async (r) => {
        if (r.length === 0) {
          // Try the name-based fallback if the jsonb path didn't match
          const r2 = await fetchRefineriesFallback();
          setRows(r2);
        } else {
          setRows(r);
        }
      })
      .catch((e) => setErr(e.message ?? String(e)));
  }, []);

  const systems = useMemo(() => {
    if (!rows) return [];
    const set = new Set<string>();
    for (const r of rows) if (r.system) set.add(r.system);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const qLower = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (system && r.system !== system) return false;
      if (qLower) {
        const cls = (r.source_data as { ClassName?: string } | null)?.ClassName ?? "";
        const hay = `${r.name} ${r.system ?? ""} ${r.planet ?? ""} ${r.place ?? ""} ${cls}`;
        if (!tokenMatch(hay, qLower)) return false;
      }
      return true;
    });
  }, [rows, q, system]);

  function readableName(t: TradeLocation): string {
    if (t.name && !t.name.startsWith("DC_") && !t.name.startsWith("RestStop_")) {
      return t.name;
    }
    // Fall back to a humanised class name
    const cls = (t.source_data as { ClassName?: string } | null)?.ClassName ?? t.name;
    return cls
      .replace(/^DC_Stan_/, "")
      .replace(/^RestStop_Pyro_Rundown_RR_/, "Pyro ")
      .replace(/_RefineryWing$/, " Refinery")
      .replace(/_Refin$/, "")
      .replace(/_/g, " ");
  }

  return (
    <div className="container-wide">
      <div className="page-header">
        <div className="accent-label">Trade · Refineries</div>
        <h1>Refineries</h1>
        <p>
          All ore-refining stations across Stanton and Pyro. Drop ore at
          one of these, queue a refining job, pick up the refined material
          to sell at higher value.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search refineries…"
          className="input"
          style={{ flex: "1 1 240px", minWidth: 220 }}
        />
        <select value={system} onChange={(e) => setSystem(e.target.value)} className="select" style={{ width: 180 }}>
          <option value="">All systems</option>
          {systems.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginBottom: 12 }}>
        {rows ? `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} refineries` : "…"}
      </div>

      {err && (
        <div style={{ padding: "10px 14px", borderRadius: 6, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", color: "var(--alert)", marginBottom: 16 }}>
          {err}
        </div>
      )}

      {rows && (
        <div className="table-shell">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle("left")}>Name</th>
                <th style={thStyle("left", 120)}>System</th>
                <th style={thStyle("left", 140)}>Planet</th>
                <th style={thStyle("left", 140)}>Kind</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td style={tdStyle}>
                    <Link
                      href={`/trade-locations?id=${encodeURIComponent(t.id)}`}
                      style={{ color: "var(--accent)", fontWeight: 500 }}
                    >
                      {readableName(t)}
                    </Link>
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{t.system ?? "—"}</td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{t.planet ?? "—"}</td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{prettyKind(t.kind)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "3rem 0", textAlign: "center", color: "var(--text-dim)" }}>
                    No refineries match these filters.
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
