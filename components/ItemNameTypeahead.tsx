"use client";

// Item-name typeahead used by the auction listing form. As the user
// types, hits the catalog table that matches the selected category
// (ships → ships, weapon → weapons, etc) and shows top-N suggestions.
// Picking a suggestion fills the input. Free-typing is always allowed
//, suggestions are hints, not enforcement, so paints / consumables /
// other can still be entered manually.

import { useEffect, useRef, useState } from "react";
import { fetchItemSuggestions, type AuctionCategory } from "@/lib/auction";

interface Props {
  category: AuctionCategory;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}

export function ItemNameTypeahead({
  category,
  value,
  onChange,
  placeholder,
  required,
  maxLength,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Debounced fetch, wait 200ms after the user stops typing so we don't
  // hammer Supabase on every keystroke.
  useEffect(() => {
    const v = value.trim();
    if (v.length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      fetchItemSuggestions(category, v).then((s) => {
        // If the only match is exactly what the user typed, hide, no
        // useful suggestion to make.
        const filtered = s.filter((x) => x.toLowerCase() !== v.toLowerCase());
        setSuggestions(filtered);
        setHighlight(0);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [value, category]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setSuggestions([]);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      // Only intercept Enter if there's a real match, otherwise let the
      // form submit normally.
      if (suggestions[highlight]) {
        e.preventDefault();
        pick(suggestions[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showHelper = !!CATEGORY_HELPER[category];

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        required={required}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={placeholder}
        maxLength={maxLength}
        className="input"
        autoComplete="off"
      />
      {showHelper && (
        <div className="label-mini" style={{ marginTop: 4 }}>
          {CATEGORY_HELPER[category]}
        </div>
      )}
      {open && suggestions.length > 0 && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 30,
            background: "#0a0e16",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6,
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            padding: 4,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={i === highlight}
              onClick={() => pick(s)}
              onMouseEnter={() => setHighlight(i)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 4,
                border: "none",
                background: i === highlight ? "rgba(77,217,255,0.10)" : "transparent",
                color: i === highlight ? "var(--accent)" : "var(--text)",
                fontSize: "0.88rem",
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
          <div
            className="label-mini"
            style={{ padding: "6px 10px 4px", color: "var(--text-dim)" }}
          >
            ↑↓ to navigate · Enter to pick · or just keep typing for a custom name
          </div>
        </div>
      )}
    </div>
  );
}

const CATEGORY_HELPER: Partial<Record<AuctionCategory, string>> = {
  ship: "Search any ship in the catalog, or type a custom name.",
  vehicle: "Search ground vehicles, or type a custom name.",
  weapon: "Search the weapon catalog, or type a custom name.",
  component: "Search the component catalog, or type a custom name.",
  blueprint: "Search blueprint recipes, or type a custom name.",
  cargo: "Search the commodity catalog, or type a custom name.",
};
