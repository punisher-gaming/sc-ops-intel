"use client";

import { useEffect, useRef, useState } from "react";

// Dropdown-style replacement for FilterPillGroup. One trigger button
// shows the category label + current selection count; clicking it
// opens a checkbox list. Handles outside-click + Escape to close.
// Designed for the Blueprints page where 5+ filter categories would
// otherwise eat the whole viewport as pill rows.

export interface FilterOption {
  value: string;
  label: string;
}

export function FilterMultiSelect({
  label,
  options,
  selected,
  onChange,
  maxMenuHeight = 340,
  minWidth = 220,
}: {
  label: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  maxMenuHeight?: number;
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(v: string) {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(next);
  }

  function clear() {
    onChange(new Set());
  }

  const count = selected.size;

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="select"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          minWidth,
          height: 40,
          padding: "0 14px",
          fontSize: "0.88rem",
          cursor: "pointer",
          textAlign: "left",
          justifyContent: "space-between",
          background: count > 0 ? "rgba(77,217,255,0.08)" : undefined,
          borderColor: count > 0 ? "rgba(77,217,255,0.4)" : undefined,
        }}
      >
        <span>
          {label}
          {count > 0 && (
            <span
              style={{
                marginLeft: 6,
                padding: "1px 7px",
                borderRadius: 10,
                background: "var(--accent)",
                color: "#001018",
                fontSize: "0.7rem",
                fontWeight: 700,
              }}
            >
              {count}
            </span>
          )}
        </span>
        <span style={{ color: "var(--text-dim)", fontSize: "0.7rem" }}>▾</span>
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 40,
            minWidth,
            maxHeight: maxMenuHeight,
            overflowY: "auto",
            padding: 6,
            background: "#0a0e16",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 8,
            boxShadow: "0 14px 34px rgba(0,0,0,0.5)",
          }}
        >
          {count > 0 && (
            <button
              type="button"
              onClick={clear}
              style={{
                width: "100%",
                padding: "6px 10px",
                marginBottom: 4,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 4,
                color: "var(--text-muted)",
                fontSize: "0.76rem",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Clear {count} selection{count === 1 ? "" : "s"}
            </button>
          )}
          {options.map((o) => {
            const on = selected.has(o.value);
            return (
              <label
                key={o.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  background: on ? "rgba(77,217,255,0.1)" : "transparent",
                  color: on ? "var(--accent)" : "var(--text)",
                }}
                onMouseEnter={(e) => {
                  if (!on) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (!on) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(o.value)}
                  style={{ accentColor: "var(--accent)", cursor: "pointer" }}
                />
                <span>{o.label}</span>
              </label>
            );
          })}
          {options.length === 0 && (
            <div style={{ padding: "10px 14px", color: "var(--text-dim)", fontSize: "0.8rem" }}>
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
