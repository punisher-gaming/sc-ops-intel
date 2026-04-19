"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  displayName,
  fetchBlueprints,
  formatCraftTime,
  prettyType,
  uniqueValues,
  type Blueprint,
} from "@/lib/blueprints";
import { tokenMatch } from "@/lib/search";
import { CURRENT_PATCH } from "./PatchPill";

export function CraftingBrowser() {
  const [rows, setRows] = useState<Blueprint[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    fetchBlueprints()
      .then(setRows)
      .catch((e) => setErr(e.message ?? String(e)));
  }, []);

  const types = useMemo(() => (rows ? uniqueValues(rows, "output_item_type") : []), [rows]);

  const results = useMemo(() => {
    if (!rows) return [];
    const qLower = q.trim().toLowerCase();
    if (!qLower && !type) return [];
    return rows
      .filter((r) => {
        if (type && r.output_item_type !== type) return false;
        if (qLower) {
          const hay = `${displayName(r)} ${r.output_item_class ?? ""} ${r.output_item_type ?? ""}`;
          if (!tokenMatch(hay, qLower)) return false;
        }
        return true;
      })
      .slice(0, 50);
  }, [rows, q, type]);

  // Aggregate: what are the top material groups across all recipes? Useful
  // preview while nothing is typed — surfaces what you can actually build.
  const groupAgg = useMemo(() => {
    if (!rows) return [];
    const counts = new Map<string, number>();
    for (const r of rows) {
      for (const g of r.required_groups ?? []) {
        const k = g.name ?? g.key ?? "—";
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [rows]);

  return (
    <div className="container-wide">
      <div className="page-header">
        <div className="accent-label">Tools</div>
        <h1>Crafting</h1>
        <p>
          Tell us what you want to make. We&apos;ll pull the blueprint,
          required material groups, and known sources from the{" "}
          {rows ? rows.length.toLocaleString() : "…"} recipes in the database.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What do you want to craft? (e.g. Sniper, Hornet, Shield)"
          className="input"
          style={{ flex: "1 1 340px", minWidth: 260, height: 48, fontSize: "1rem" }}
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="select" style={{ width: 200, height: 48 }}>
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {prettyType(t)}
            </option>
          ))}
        </select>
      </div>

      {err && <ErrorBar text={`Couldn't load recipes: ${err}`} />}
      {!rows && !err && <div style={{ color: "var(--text-muted)" }}>Loading recipes…</div>}

      {rows && !q && !type && (
        <div>
          <div className="accent-label" style={{ marginBottom: 12 }}>Most-used material groups</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
              marginBottom: 28,
            }}
          >
            {groupAgg.map(([name, n]) => (
              <button
                key={name}
                onClick={() => setQ(name)}
                className="card card-hover"
                style={{
                  padding: "14px 16px",
                  textAlign: "left",
                  background: "rgba(255,255,255,0.03)",
                  cursor: "pointer",
                  color: "var(--text)",
                }}
              >
                <div style={{ fontWeight: 500 }}>{name}</div>
                <div className="label-mini" style={{ marginTop: 4 }}>
                  used in {n.toLocaleString()} recipe{n === 1 ? "" : "s"}
                </div>
              </button>
            ))}
          </div>
          <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Tips</div>
            <ul style={{ paddingLeft: "1.25rem", color: "var(--text-muted)", lineHeight: 1.7, fontSize: "0.9rem" }}>
              <li>Search by weapon name (&ldquo;Sniper&rdquo;, &ldquo;LMG&rdquo;), ship class, or item type.</li>
              <li>Use the type filter to narrow to Weapons, Components, Armor, etc.</li>
              <li>Each recipe links to its full blueprint detail page with known sources.</li>
            </ul>
          </div>
        </div>
      )}

      {rows && (q || type) && (
        <div>
          <div className="label-mini" style={{ marginBottom: 10 }}>
            {results.length === 0
              ? "No matches"
              : `${results.length}${results.length >= 50 ? "+" : ""} match${results.length === 1 ? "" : "es"}`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {results.map((r) => (
              <Link
                key={r.id}
                href={`/blueprints?id=${encodeURIComponent(r.id)}`}
                className="card card-hover"
                style={{ padding: "1rem 1.25rem", textDecoration: "none", color: "var(--text)", display: "block" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--accent)" }}>
                      {displayName(r)}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                      {prettyType(r.output_item_type)}
                      {r.output_item_subtype && ` · ${r.output_item_subtype}`}
                      {r.output_grade && ` · Grade ${r.output_grade}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    <span className="badge badge-muted">
                      {(r.required_groups?.length ?? 0)} group{(r.required_groups?.length ?? 0) === 1 ? "" : "s"}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      {formatCraftTime(r.craft_time_seconds)}
                    </span>
                  </div>
                </div>
                {r.required_groups && r.required_groups.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    {r.required_groups.map((g, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {g.name ?? g.key ?? "—"}
                        {g.required_count != null && g.required_count > 1 && (
                          <span style={{ color: "var(--accent)", marginLeft: 4 }}>×{g.required_count}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
            {results.length === 0 && (
              <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-dim)" }}>
                Nothing matches. Try a broader search, or clear the type filter.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="label-mini" style={{ marginTop: "2rem", textAlign: "center" }}>
        Patch {CURRENT_PATCH}
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
