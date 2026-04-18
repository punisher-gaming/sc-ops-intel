"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  displayName,
  fetchResource,
  fetchResourceLocations,
  fetchResources,
  formatPct,
  prettyKind,
  uniqueValues,
  type Resource,
  type ResourceLocation,
} from "@/lib/resources";
import { CURRENT_PATCH } from "./PatchPill";
import { IntelPanel } from "./IntelPanel";

const PAGE_SIZE = 50;

export function ResourcesBrowser() {
  const params = useSearchParams();
  const id = params.get("id");
  if (id) return <ResourceDetail id={id} />;
  return <ResourceList />;
}

function ResourceList() {
  const [rows, setRows] = useState<Resource[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchResources()
      .then(setRows)
      .catch((e) => setErr(e.message ?? String(e)));
  }, []);

  const kinds = useMemo(() => (rows ? uniqueValues(rows, "kind") : []), [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const qLower = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind && r.kind !== kind) return false;
      if (qLower) {
        const hay = `${displayName(r)} ${r.key} ${r.kind ?? ""}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [rows, q, kind]);

  useEffect(() => {
    setPage(0);
  }, [q, kind]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="container-wide">
      <div className="page-header">
        <div className="accent-label">Catalog</div>
        <h1>Resources</h1>
        <p>
          Every mineable, harvestable, and salvageable material in the game.
          Click a row to see every known spawn location across Stanton and
          Pyro.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search resources…"
          className="input"
          style={{ flex: "1 1 260px", minWidth: 240 }}
        />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="select" style={{ width: 220 }}>
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
        <div>
          {rows ? `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} resources` : "…"}
        </div>
        {pageCount > 1 && (
          <Pager page={page} pageCount={pageCount} setPage={setPage} />
        )}
      </div>

      {err && <ErrorBar text={`Couldn't load resources: ${err}`} />}
      {!rows && !err && <div style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Loading…</div>}

      {rows && (
        <div className="table-shell">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle("left")}>Name</th>
                <th style={thStyle("left", 200)}>Kind</th>
                <th style={thStyle("right", 120)}>Base value</th>
                <th style={thStyle("left", 140)}>Rarity</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>
                    <Link href={`/resources?id=${encodeURIComponent(r.id)}`} style={{ color: "var(--accent)", fontWeight: 500 }}>
                      {displayName(r)}
                    </Link>
                    <div style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                      {r.key}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{prettyKind(r.kind)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {r.base_value != null ? r.base_value.toLocaleString() : "—"}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{r.rarity ?? "—"}</td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "3rem 0", textAlign: "center", color: "var(--text-dim)" }}>
                    No resources match these filters.
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

function ResourceDetail({ id }: { id: string }) {
  const [resource, setResource] = useState<Resource | null | undefined>(undefined);
  const [locations, setLocations] = useState<ResourceLocation[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r, locs] = await Promise.all([fetchResource(id), fetchResourceLocations(id)]);
        if (cancelled) return;
        setResource(r);
        setLocations(locs);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (err) return <div className="container"><ErrorBar text={err} /></div>;
  if (resource === undefined)
    return <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>Loading…</div>;
  if (resource === null)
    return (
      <div className="container" style={{ paddingTop: "3rem" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ color: "var(--alert)", marginBottom: 12 }}>Resource not found</div>
          <Link href="/resources" style={{ color: "var(--accent)" }}>← Back to all resources</Link>
        </div>
      </div>
    );

  // Group locations by system → location_name for a cleaner read.
  const bySystem = new Map<string, Map<string, ResourceLocation[]>>();
  for (const l of locations) {
    const sys = l.system ?? "Unknown system";
    const place = l.location_name ?? l.provider_name ?? "Unknown location";
    if (!bySystem.has(sys)) bySystem.set(sys, new Map());
    const placeMap = bySystem.get(sys)!;
    if (!placeMap.has(place)) placeMap.set(place, []);
    placeMap.get(place)!.push(l);
  }

  return (
    <div className="container-wide">
      <div style={{ paddingTop: "1.5rem" }}>
        <Link href="/resources" className="label-mini" style={{ color: "var(--accent)" }}>
          ← All resources
        </Link>
      </div>

      <div className="page-header">
        <div className="accent-label">{prettyKind(resource.kind)}</div>
        <h1>{displayName(resource)}</h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-dim)" }}>
          {resource.key}
        </p>
        {resource.description && <p style={{ marginTop: 8 }}>{resource.description}</p>}
      </div>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "1rem" }}>
        <Stat label="Base value" value={resource.base_value != null ? resource.base_value.toLocaleString() : "—"} />
        <Stat label="Rarity" value={resource.rarity ?? "—"} />
        <Stat label="Spawn locations" value={String(locations.length)} />
        <Stat label="Systems" value={String(bySystem.size)} />
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 14 }}>Known spawn locations</div>
        {locations.length === 0 ? (
          <div style={{ color: "var(--text-dim)" }}>
            No canonical spawn locations recorded for this resource yet.
            Community intel will show here when submitted.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {Array.from(bySystem.entries()).map(([sys, placeMap]) => (
              <div key={sys}>
                <div className="accent-label" style={{ marginBottom: 10 }}>
                  {sys} <span style={{ color: "var(--text-dim)" }}>· {Array.from(placeMap.values()).reduce((a, b) => a + b.length, 0)} spawn{Array.from(placeMap.values()).reduce((a, b) => a + b.length, 0) === 1 ? "" : "s"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Array.from(placeMap.entries()).map(([place, locs]) => (
                    <div
                      key={place}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>{place}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {locs.map((l) => (
                          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "0.85rem" }}>
                            <div style={{ color: "var(--text-muted)" }}>
                              {l.group_name ?? "—"}
                              {l.location_type && (
                                <span style={{ color: "var(--text-dim)" }}> · {l.location_type}</span>
                              )}
                              {l.clustering_key && (
                                <span className="label-mini" style={{ marginLeft: 8 }}>{l.clustering_key}</span>
                              )}
                            </div>
                            <div style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", whiteSpace: "nowrap" }}>
                              {formatPct(l.group_probability)}
                              {l.relative_probability != null && (
                                <span style={{ color: "var(--text-dim)" }}> · deposit {formatPct(l.relative_probability)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginTop: 14, lineHeight: 1.5 }}>
          Spawn probabilities are from game data. The first percentage is the
          chance the group rolls at that location; the second is how likely
          this specific resource appears within the group.
        </p>
      </div>

      <IntelPanel entityType="resource" entityId={resource.id} entityName={displayName(resource)} />

      <div className="label-mini" style={{ marginTop: "2rem", textAlign: "center" }}>
        Last synced{" "}
        {resource.last_synced_at
          ? new Date(resource.last_synced_at).toISOString().replace("T", " ").slice(0, 19) + " UTC"
          : "—"}
        {" · "}
        Patch {resource.game_version ?? CURRENT_PATCH}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div className="label-mini" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{value}</div>
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
