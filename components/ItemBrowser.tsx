"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchItem,
  fetchItems,
  formatGrade,
  isPlaceholderName,
  itemClass,
  prettyType,
  uniqueItemValues,
  type GradeStyle,
  type Item,
} from "@/lib/items";
import { tokenMatch } from "@/lib/search";
import { CURRENT_PATCH } from "./PatchPill";
import { ItemImage, ItemImageCredit } from "./ItemImage";
import { WhereToBuy } from "./WhereToBuy";

const PAGE_SIZE = 50;

// Shared browser used by /weapons and /components. Pass `table` to switch
// between them — same column shape, different DB table.

export function ItemBrowser({
  table,
  title,
  blurb,
  gradeStyle = "number",
}: {
  table: "weapons" | "components";
  title: string;
  blurb: string;
  gradeStyle?: GradeStyle;
}) {
  const params = useSearchParams();
  const id = params.get("id");
  if (id) return <ItemDetail table={table} title={title} id={id} gradeStyle={gradeStyle} />;
  return <ItemList table={table} title={title} blurb={blurb} gradeStyle={gradeStyle} />;
}

function ItemList({
  table,
  title,
  blurb,
  gradeStyle,
}: {
  table: "weapons" | "components";
  title: string;
  blurb: string;
  gradeStyle: GradeStyle;
}) {
  const [rows, setRows] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [mfr, setMfr] = useState("");
  const [grade, setGrade] = useState("");
  const [cls, setCls] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchItems(table)
      .then(setRows)
      .catch((e) => setErr(e.message ?? String(e)));
  }, [table]);

  const types = useMemo(() => (rows ? uniqueItemValues(rows, "type") : []), [rows]);
  const mfrs = useMemo(() => (rows ? uniqueItemValues(rows, "manufacturer") : []), [rows]);
  const grades = useMemo(() => {
    if (!rows) return [];
    const set = new Set<number>();
    for (const r of rows) if (typeof r.grade === "number") set.add(r.grade);
    return Array.from(set).sort((a, b) => a - b);
  }, [rows]);
  const classes = useMemo(() => {
    if (!rows) return [];
    const set = new Set<string>();
    for (const r of rows) {
      const c = itemClass(r);
      if (c) set.add(c);
    }
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const qLower = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (type && r.type !== type) return false;
      if (mfr && r.manufacturer !== mfr) return false;
      if (grade && String(r.grade) !== grade) return false;
      if (cls && itemClass(r) !== cls) return false;
      if (qLower) {
        const hay = `${r.name} ${r.class_name} ${r.manufacturer ?? ""} ${r.subtype ?? ""} ${itemClass(r) ?? ""}`;
        if (!tokenMatch(hay, qLower)) return false;
      }
      return true;
    });
  }, [rows, q, type, mfr, grade, cls]);

  useEffect(() => setPage(0), [q, type, mfr, grade, cls]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="container-wide">
      <div className="page-header">
        <div className="accent-label">Catalog</div>
        <h1>{title}</h1>
        <p>{blurb}</p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}…`}
          className="input"
          style={{ flex: "1 1 240px", minWidth: 220 }}
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="select" style={{ width: 200 }}>
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {prettyType(t)}
            </option>
          ))}
        </select>
        <select value={mfr} onChange={(e) => setMfr(e.target.value)} className="select" style={{ width: 180 }}>
          <option value="">All manufacturers</option>
          {mfrs.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="select" style={{ width: 130 }}>
          <option value="">All grades</option>
          {grades.map((g) => (
            <option key={g} value={String(g)}>
              Grade {formatGrade(g, gradeStyle)}
            </option>
          ))}
        </select>
        {classes.length > 0 && (
          <select value={cls} onChange={(e) => setCls(e.target.value)} className="select" style={{ width: 160 }}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
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
        <div>{rows ? `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()}` : "…"}</div>
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

      {err && <ErrorBar text={`Couldn't load ${title.toLowerCase()}: ${err}`} />}
      {!rows && !err && <div style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Loading…</div>}

      {rows && (
        <div className="table-shell">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle("left")}>Name</th>
                <th style={thStyle("left", 130)}>Manufacturer</th>
                <th style={thStyle("left", 170)}>Type</th>
                {classes.length > 0 && <th style={thStyle("left", 110)}>Class</th>}
                <th style={thStyle("left", 70)}>Grade</th>
                <th style={thStyle("left", 70)}>Size</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>
                    <Link
                      href={`?id=${encodeURIComponent(r.id)}`}
                      style={{ color: "var(--accent)", fontWeight: 500 }}
                    >
                      {isPlaceholderName(r.name) ? r.class_name : r.name}
                    </Link>
                    {r.subtype && (
                      <div style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginTop: 2 }}>
                        {r.subtype}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{r.manufacturer ?? "—"}</td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{prettyType(r.type)}</td>
                  {classes.length > 0 && (
                    <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{itemClass(r) ?? "—"}</td>
                  )}
                  <td style={{ ...tdStyle, fontFamily: "var(--font-mono)" }}>{formatGrade(r.grade, gradeStyle)}</td>
                  <td style={{ ...tdStyle, fontFamily: "var(--font-mono)" }}>{r.size ?? "—"}</td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={classes.length > 0 ? 6 : 5} style={{ padding: "3rem 0", textAlign: "center", color: "var(--text-dim)" }}>
                    No matches.
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

function ItemDetail({
  table,
  title,
  id,
  gradeStyle,
}: {
  table: "weapons" | "components";
  title: string;
  id: string;
  gradeStyle: GradeStyle;
}) {
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchItem(table, id)
      .then(setItem)
      .catch((e) => setErr(e.message ?? String(e)));
  }, [table, id]);

  if (err) return <div className="container"><ErrorBar text={err} /></div>;
  if (item === undefined)
    return <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>Loading…</div>;
  if (item === null)
    return (
      <div className="container" style={{ paddingTop: "3rem" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ color: "var(--alert)", marginBottom: 12 }}>{title.replace(/s$/, "")} not found</div>
          <Link href={`/${table}`} style={{ color: "var(--accent)" }}>← Back to all {title.toLowerCase()}</Link>
        </div>
      </div>
    );

  const displayName = isPlaceholderName(item.name) ? item.class_name : item.name;

  return (
    <div className="container-wide">
      <div style={{ paddingTop: "1.5rem" }}>
        <Link href={`/${table}`} className="label-mini" style={{ color: "var(--accent)" }}>
          ← All {title.toLowerCase()}
        </Link>
      </div>

      <div
        className="page-header"
        style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "220px 1fr", alignItems: "start" }}
      >
        <div>
          <ItemImage
            kind="item"
            candidates={[item.name, item.class_name]}
            alt={displayName}
            size={400}
          />
          <ItemImageCredit />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="accent-label">
            {prettyType(item.type)}
            {item.subtype && ` · ${item.subtype}`}
            {item.grade != null && ` · Grade ${formatGrade(item.grade, gradeStyle)}`}
          </div>
          <h1>{displayName}</h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-dim)" }}>
            {item.class_name}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: "1rem" }}>
        <Stat label="Manufacturer" value={item.manufacturer ?? "—"} />
        <Stat label="Type" value={prettyType(item.type)} />
        <Stat label="Subtype" value={item.subtype ?? "—"} />
        <Stat label="Grade" value={formatGrade(item.grade, gradeStyle)} />
        <Stat label="Size" value={item.size != null ? String(item.size) : "—"} />
        {itemClass(item) && <Stat label="Class" value={itemClass(item)!} />}
      </div>

      <WhereToBuy itemReference={item.id} />

      {/* Raw item data block removed — jsonb dumps don't belong in the UI. */}

      <div className="label-mini" style={{ marginTop: "2rem", textAlign: "center" }}>
        Last synced{" "}
        {item.last_synced_at
          ? new Date(item.last_synced_at).toISOString().replace("T", " ").slice(0, 19) + " UTC"
          : "—"}
        {" · "}
        Patch {item.game_version ?? CURRENT_PATCH}
      </div>
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
    whiteSpace: "nowrap",
  };
}

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  fontSize: "0.875rem",
};
