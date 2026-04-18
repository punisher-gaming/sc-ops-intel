"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchShips, type Ship } from "@/lib/ships";
import { fetchBlueprints, displayName as bpName, type Blueprint } from "@/lib/blueprints";
import { fetchResources, displayName as resName, type Resource } from "@/lib/resources";

// Global search: one input in the nav that queries across ships,
// blueprints, and resources. Loads the three catalogs lazily on first
// focus, caches in-memory for the rest of the session. Results grouped
// by type with top 5 from each.

type IndexEntry = {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  kind: "ship" | "blueprint" | "resource";
  hay: string; // precomputed lowercase haystack
};

type IndexState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; entries: IndexEntry[] }
  | { status: "error"; message: string };

let cache: IndexEntry[] | null = null;

async function buildIndex(): Promise<IndexEntry[]> {
  if (cache) return cache;
  const [ships, blueprints, resources] = await Promise.all([
    fetchShips().catch(() => [] as Ship[]),
    fetchBlueprints().catch(() => [] as Blueprint[]),
    fetchResources().catch(() => [] as Resource[]),
  ]);

  const out: IndexEntry[] = [];
  for (const s of ships) {
    out.push({
      id: s.id,
      name: s.name,
      subtitle: [s.manufacturer, s.role, s.size_class].filter(Boolean).join(" · ") || "Ship",
      href: `/ships?id=${encodeURIComponent(s.id)}`,
      kind: "ship",
      hay: `${s.name} ${s.manufacturer ?? ""} ${s.role ?? ""}`.toLowerCase(),
    });
  }
  for (const b of blueprints) {
    const n = bpName(b);
    out.push({
      id: b.id,
      name: n,
      subtitle: [b.output_item_type, b.output_item_subtype, b.output_grade && `G${b.output_grade}`]
        .filter(Boolean)
        .join(" · ") || "Blueprint",
      href: `/blueprints?id=${encodeURIComponent(b.id)}`,
      kind: "blueprint",
      hay: `${n} ${b.output_item_class ?? ""} ${b.output_item_type ?? ""} ${b.key}`.toLowerCase(),
    });
  }
  for (const r of resources) {
    const n = resName(r);
    out.push({
      id: r.id,
      name: n,
      subtitle: r.kind ? r.kind.replace(/_/g, " ") : "Resource",
      href: `/resources?id=${encodeURIComponent(r.id)}`,
      kind: "resource",
      hay: `${n} ${r.key} ${r.kind ?? ""}`.toLowerCase(),
    });
  }
  cache = out;
  return out;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<IndexState>({ status: "idle" });
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ⌘K / Ctrl-K to open, Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Load index on first open
  useEffect(() => {
    if (!open) return;
    if (index.status === "idle") {
      setIndex({ status: "loading" });
      buildIndex()
        .then((entries) => setIndex({ status: "ready", entries }))
        .catch((e: unknown) => setIndex({ status: "error", message: (e as Error).message ?? String(e) }));
    }
    // Focus input when opening
    setTimeout(() => inputRef.current?.focus(), 20);
  }, [open, index.status]);

  const results = useMemo(() => {
    if (index.status !== "ready") return { ships: [], blueprints: [], resources: [], total: 0 };
    const qLower = q.trim().toLowerCase();
    if (!qLower) return { ships: [], blueprints: [], resources: [], total: 0 };
    const ships: IndexEntry[] = [];
    const blueprints: IndexEntry[] = [];
    const resources: IndexEntry[] = [];
    for (const e of index.entries) {
      if (!e.hay.includes(qLower)) continue;
      if (e.kind === "ship" && ships.length < 5) ships.push(e);
      else if (e.kind === "blueprint" && blueprints.length < 5) blueprints.push(e);
      else if (e.kind === "resource" && resources.length < 5) resources.push(e);
      if (ships.length >= 5 && blueprints.length >= 5 && resources.length >= 5) break;
    }
    return { ships, blueprints, resources, total: ships.length + blueprints.length + resources.length };
  }, [index, q]);

  const flat = useMemo(
    () => [...results.ships, ...results.blueprints, ...results.resources],
    [results],
  );

  useEffect(() => setCursor(0), [q]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(flat.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter" && flat[cursor]) {
      window.location.href = flat[cursor].href;
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 32,
          padding: "0 10px 0 12px",
          borderRadius: 6,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "var(--text-muted)",
          fontSize: "0.85rem",
          cursor: "pointer",
        }}
        aria-label="Search"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span>Search</span>
        <span
          style={{
            marginLeft: 6,
            padding: "1px 6px",
            fontSize: "0.7rem",
            fontFamily: "var(--font-mono)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 3,
            color: "var(--text-dim)",
          }}
        >
          ⌘K
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            paddingTop: "10vh",
          }}
        >
          <div
            style={{
              width: "min(640px, 92vw)",
              background: "#0a0e16",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              maxHeight: "75vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-dim)" }}>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search ships, blueprints, resources…"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text)",
                  fontFamily: "inherit",
                  fontSize: "1rem",
                }}
              />
              <span className="label-mini">Esc</span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {index.status === "loading" && (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-dim)" }}>
                  Indexing catalog…
                </div>
              )}
              {index.status === "error" && (
                <div style={{ padding: "1rem 1.25rem", color: "var(--alert)" }}>
                  Search index failed: {index.message}
                </div>
              )}
              {index.status === "ready" && !q && (
                <div style={{ padding: "1rem 1.25rem", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                  <div style={{ marginBottom: 6 }}>
                    {index.entries.length.toLocaleString()} items indexed across ships, blueprints, and resources.
                  </div>
                  <div>Start typing to search — try "Hornet", "Sniper", "Agricium"…</div>
                </div>
              )}
              {index.status === "ready" && q && results.total === 0 && (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-dim)" }}>
                  No matches for &ldquo;{q}&rdquo;
                </div>
              )}
              {results.total > 0 && (
                <>
                  {renderSection("Ships", results.ships, flat, cursor, () => setOpen(false))}
                  {renderSection("Blueprints", results.blueprints, flat, cursor, () => setOpen(false))}
                  {renderSection("Resources", results.resources, flat, cursor, () => setOpen(false))}
                </>
              )}
            </div>

            {index.status === "ready" && results.total > 0 && (
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  padding: "8px 14px",
                  color: "var(--text-dim)",
                  fontSize: "0.75rem",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>↑↓ to navigate · ↵ to open</span>
                <span>{results.total} result{results.total === 1 ? "" : "s"}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function renderSection(
  title: string,
  entries: IndexEntry[],
  flat: IndexEntry[],
  cursor: number,
  onClick: () => void,
) {
  if (entries.length === 0) return null;
  return (
    <div key={title} style={{ marginBottom: 4 }}>
      <div className="label-mini" style={{ padding: "8px 16px 4px" }}>{title}</div>
      {entries.map((e) => {
        const idx = flat.indexOf(e);
        const active = idx === cursor;
        return (
          <Link
            key={`${e.kind}-${e.id}`}
            href={e.href}
            onClick={onClick}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              background: active ? "rgba(77,217,255,0.1)" : "transparent",
              borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
              textDecoration: "none",
              color: "var(--text)",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.name}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: 2 }}>
                {e.subtitle}
              </div>
            </div>
            <span className="label-mini">{e.kind}</span>
          </Link>
        );
      })}
    </div>
  );
}
