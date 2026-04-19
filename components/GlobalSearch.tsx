"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchShips } from "@/lib/ships";
import { tokenMatch } from "@/lib/search";
import { fetchBlueprints, displayName as bpName } from "@/lib/blueprints";
import { fetchResources, displayName as resName } from "@/lib/resources";
import { fetchItems, isPlaceholderName } from "@/lib/items";

// Global floating search: indexes ships + blueprints + resources +
// weapons + components on first open, caches in-memory for the session.
// Errors surface in the UI rather than silently producing empty results.

type EntryKind = "ship" | "blueprint" | "resource" | "weapon" | "component";

type IndexEntry = {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  kind: EntryKind;
  hay: string;
};

type IndexState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; entries: IndexEntry[] }
  | { status: "error"; message: string };

let cache: IndexEntry[] | null = null;

async function buildIndex(): Promise<IndexEntry[]> {
  if (cache) return cache;
  // Run all five fetches in parallel. Any failure here propagates so the
  // UI can show "search index failed: <reason>" instead of an empty,
  // mysteriously-broken search.
  const [ships, blueprints, resources, weapons, components] = await Promise.all([
    fetchShips(),
    fetchBlueprints(),
    fetchResources(),
    fetchItems("weapons"),
    fetchItems("components"),
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
  for (const w of weapons) {
    const n = isPlaceholderName(w.name) ? w.class_name : w.name;
    out.push({
      id: w.id,
      name: n,
      subtitle: [w.manufacturer, w.type, w.subtype].filter(Boolean).join(" · ") || "Weapon",
      href: `/weapons?id=${encodeURIComponent(w.id)}`,
      kind: "weapon",
      hay: `${n} ${w.class_name} ${w.manufacturer ?? ""} ${w.type ?? ""} ${w.subtype ?? ""}`.toLowerCase(),
    });
  }
  for (const c of components) {
    const n = isPlaceholderName(c.name) ? c.class_name : c.name;
    out.push({
      id: c.id,
      name: n,
      subtitle: [c.manufacturer, c.type, c.subtype].filter(Boolean).join(" · ") || "Component",
      href: `/components?id=${encodeURIComponent(c.id)}`,
      kind: "component",
      hay: `${n} ${c.class_name} ${c.manufacturer ?? ""} ${c.type ?? ""} ${c.subtype ?? ""}`.toLowerCase(),
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
    const empty = { ships: [], blueprints: [], resources: [], weapons: [], components: [], total: 0 };
    if (index.status !== "ready") return empty;
    const qLower = q.trim().toLowerCase();
    if (!qLower) return empty;
    const ships: IndexEntry[] = [];
    const blueprints: IndexEntry[] = [];
    const resources: IndexEntry[] = [];
    const weapons: IndexEntry[] = [];
    const components: IndexEntry[] = [];
    const cap = 5;
    // Token match: query is split on whitespace, every token must appear
    // in the haystack. Lets "Palatino Daystar" find "Palatino Arms Daystar".
    for (const e of index.entries) {
      if (!tokenMatch(e.hay, qLower)) continue;
      if (e.kind === "ship" && ships.length < cap) ships.push(e);
      else if (e.kind === "blueprint" && blueprints.length < cap) blueprints.push(e);
      else if (e.kind === "resource" && resources.length < cap) resources.push(e);
      else if (e.kind === "weapon" && weapons.length < cap) weapons.push(e);
      else if (e.kind === "component" && components.length < cap) components.push(e);
      if (
        ships.length >= cap && blueprints.length >= cap && resources.length >= cap &&
        weapons.length >= cap && components.length >= cap
      ) break;
    }
    return {
      ships,
      blueprints,
      resources,
      weapons,
      components,
      total: ships.length + blueprints.length + resources.length + weapons.length + components.length,
    };
  }, [index, q]);

  const flat = useMemo(
    () => [...results.ships, ...results.blueprints, ...results.resources, ...results.weapons, ...results.components],
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
        className="search-fab"
        aria-label="Search"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="search-fab-label">Search</span>
        <span className="search-fab-kbd">⌘K</span>
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
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
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
                  {renderSection("Weapons", results.weapons, flat, cursor, () => setOpen(false))}
                  {renderSection("Components", results.components, flat, cursor, () => setOpen(false))}
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
