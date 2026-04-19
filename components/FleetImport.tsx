"use client";

import { useState } from "react";
import { fetchShips, type Ship } from "@/lib/ships";
import { saveFleet } from "@/lib/fleets";

// Import a fleet JSON exported from another tool (Hangar XPLOR, custom
// scripts, etc.) and turn it into a saved fleet on this profile.
//
// We're permissive about input shape — any of these work:
//   1. Array of strings:                ["Polaris", "Cutlass Black", ...]
//   2. Array of objects with .name:     [{name: "Polaris", manufacturer: "RSI"}, ...]
//   3. Object wrapper with .ships/.hangar/.items: {ships: [...]}
//   4. Hangar XPLOR style: array of {name | shipName | ship_name}
//
// Matching strategy: case-insensitive, accent-insensitive contains-match
// against ships.name and ships.class_name (via source_data when available).
// We try the longest unique candidate first to avoid matching "Cutlass" to
// every Cutlass variant — exact name match wins, then prefix, then contains.
//
// Preview shows matched + unmatched before save. User can edit the fleet
// name and add notes. The actual ship_ids[] is what gets saved.

interface ParsedEntry {
  rawName: string;
  matchedShip: Ship | null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, " ") // collapse punctuation to spaces
    .trim();
}

function extractNames(input: unknown): string[] {
  // === Hangarlink format detection ===
  // The official-ish RSI hangar export tool emits:
  //   { type: "hangarlink", version: 1, pledges: [...] }
  // Each pledge is a purchased pledge. Two ways the ship name shows up:
  //   1. Solo ship pledges: items[] contains only Skin/Insurance (no Ship
  //      kind), so the ship name has to be parsed from `contains` which
  //      reads "<Ship Name> and N items".
  //   2. Pack pledges: items[] contains entries with kind === "Ship" whose
  //      `title` is the actual ship name. We collect every Ship item.
  // Skip pledgeType === "upgrade" (CCUs aren't actual hangared ships) and
  // any pledge that yields nothing useful from either path.
  if (
    input &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    (input as { type?: unknown }).type === "hangarlink" &&
    Array.isArray((input as { pledges?: unknown }).pledges)
  ) {
    const pledges = (input as { pledges: unknown[] }).pledges;
    const out: string[] = [];
    for (const raw of pledges) {
      if (!raw || typeof raw !== "object") continue;
      const p = raw as Record<string, unknown>;
      if (p.pledgeType === "upgrade" || p.pledgeType === "other") continue;

      // Collect kind="Ship" items first (handles packs)
      const items = Array.isArray(p.items) ? (p.items as unknown[]) : [];
      let foundShipItem = false;
      for (const it of items) {
        if (!it || typeof it !== "object") continue;
        const i = it as Record<string, unknown>;
        if (i.kind === "Ship" && typeof i.title === "string" && i.title.trim()) {
          out.push(i.title.trim());
          foundShipItem = true;
        }
      }

      // If no Ship items were listed, parse the ship name from `contains`
      // for solo ship pledges. The string follows one of these shapes:
      //   "Aurora MR and 4 items"           → "Aurora MR"
      //   "A.T.L.S. and 6 Month Insurance"  → "A.T.L.S."
      //   "Cutlass Black"                   → "Cutlass Black"
      //   "16 ships and 16 items"           → SKIP (it's a pack we can't
      //                                       enumerate without RSI looking
      //                                       up the package contents)
      if (!foundShipItem && typeof p.contains === "string") {
        const c = p.contains.trim();
        if (!c) continue;
        // Skip pure ship/item counts — those mean an opaque pack
        if (/^\d+\s+ships?(\s+and\s+.*)?$/i.test(c)) continue;
        if (/^\d+\s+items?$/i.test(c)) continue;
        // Strip "and …" suffix (insurance, items count, etc.)
        const m = c.match(/^(.+?)\s+and\s+.+$/i);
        const name = m ? m[1].trim() : c;
        // Belt-and-suspenders: drop if the captured name is still a count
        if (!/^\d+\s+ships?$/i.test(name) && name) {
          out.push(name);
        }
      }
    }
    return out;
  }

  // Drill through wrapper objects to find an array
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const obj = input as Record<string, unknown>;
    for (const key of ["ships", "hangar", "items", "fleet", "data"]) {
      if (Array.isArray(obj[key])) {
        return extractNames(obj[key]);
      }
    }
    return [];
  }
  if (!Array.isArray(input)) return [];

  const out: string[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      const t = item.trim();
      if (t) out.push(t);
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      // Try common keys in order of specificity
      const candidate =
        (o.name as string | undefined) ??
        (o.shipName as string | undefined) ??
        (o.ship_name as string | undefined) ??
        (o.model as string | undefined) ??
        (o.title as string | undefined);
      if (typeof candidate === "string" && candidate.trim()) {
        out.push(candidate.trim());
      }
    }
  }
  return out;
}

function matchShip(rawName: string, ships: Ship[]): Ship | null {
  const target = normalize(rawName);
  if (!target) return null;

  let exact: Ship | null = null;
  let prefix: Ship | null = null;
  let prefixLen = 0;
  let contains: Ship | null = null;
  let containsLen = 0;

  for (const s of ships) {
    const sname = normalize(s.name);
    if (sname === target) {
      // Exact name match — best possible
      return s;
    }
    // Manufacturer + name combined ("RSI Polaris" → "polaris")
    if (s.manufacturer) {
      const fullName = normalize(`${s.manufacturer} ${s.name}`);
      if (fullName === target) {
        exact = exact ?? s;
        continue;
      }
    }
    if (sname.startsWith(target) || target.startsWith(sname)) {
      // Prefer longer prefix matches (more specific)
      if (sname.length > prefixLen) {
        prefix = s;
        prefixLen = sname.length;
      }
    } else if (sname.includes(target) || target.includes(sname)) {
      if (sname.length > containsLen) {
        contains = s;
        containsLen = sname.length;
      }
    }
  }
  return exact ?? prefix ?? contains;
}

export function FleetImport({
  userId,
  onSaved,
}: {
  userId: string;
  onSaved?: () => void;
}) {
  const [parsing, setParsing] = useState(false);
  const [entries, setEntries] = useState<ParsedEntry[] | null>(null);
  const [fleetName, setFleetName] = useState("Imported fleet");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setSavedAt(null);
    setParsing(true);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("That file isn't valid JSON. Try exporting again.");
      }
      const names = extractNames(parsed);
      if (names.length === 0) {
        throw new Error(
          "Couldn't find any ship names in that file. We accept arrays of names or arrays of {name: …} objects.",
        );
      }
      const ships = await fetchShips();
      const result: ParsedEntry[] = names.map((rawName) => ({
        rawName,
        matchedShip: matchShip(rawName, ships),
      }));
      setEntries(result);
      // Default fleet name from filename
      const base = file.name.replace(/\.[^.]+$/, "").trim();
      if (base) setFleetName(base);
    } catch (e) {
      setError((e as Error).message ?? String(e));
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    if (!entries) return;
    const matched = entries.filter((e) => e.matchedShip).map((e) => e.matchedShip!.id);
    if (matched.length === 0) {
      setError("Nothing to save — no rows matched our ship catalog.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveFleet({
        user_id: userId,
        name: fleetName.trim() || "Imported fleet",
        ship_ids: matched,
        notes: "Imported from JSON",
      });
      setEntries(null);
      setSavedAt(Date.now());
      onSaved?.();
    } catch (e) {
      setError((e as Error).message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  const matchedCount = entries?.filter((e) => e.matchedShip).length ?? 0;
  const unmatchedCount = entries ? entries.length - matchedCount : 0;

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 6 }}>
        Import fleet from JSON
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 14, lineHeight: 1.5 }}>
        Already exported your hangar from another tool (Hangar XPLOR, RSI
        scraper, custom script)? Drop the JSON here and we&apos;ll match each
        ship against our catalog and save it as a new fleet on your profile.
      </p>

      {!entries && (
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px dashed rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.03)",
            cursor: "pointer",
            fontSize: "0.9rem",
            color: "var(--text-muted)",
          }}
        >
          {parsing ? "Reading…" : "📂 Choose a .json file"}
          <input
            type="file"
            accept="application/json,.json"
            disabled={parsing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            style={{ display: "none" }}
          />
        </label>
      )}

      {savedAt && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 6,
            background: "rgba(74,222,128,0.1)",
            border: "1px solid rgba(74,222,128,0.3)",
            color: "var(--success)",
            fontSize: "0.85rem",
          }}
        >
          ✓ Fleet saved. It now appears in your Saved fleets above.
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 6,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "var(--alert)",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {entries && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 12, alignItems: "center" }}>
            <div style={{ fontSize: "0.85rem" }}>
              <span style={{ color: "var(--success)" }}>✓ {matchedCount} matched</span>
              {unmatchedCount > 0 && (
                <span style={{ color: "var(--warn)", marginLeft: 12 }}>
                  ⚠ {unmatchedCount} unmatched
                </span>
              )}
            </div>
            <input
              value={fleetName}
              onChange={(e) => setFleetName(e.target.value)}
              placeholder="Fleet name"
              className="input"
              style={{ flex: 1, minWidth: 200, height: 32 }}
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || matchedCount === 0}
              className="btn btn-primary"
              style={{ height: 32 }}
            >
              {saving ? "Saving…" : `Save ${matchedCount} ships as fleet`}
            </button>
            <button
              type="button"
              onClick={() => {
                setEntries(null);
                setError(null);
              }}
              className="btn btn-ghost"
              style={{ height: 32 }}
            >
              Cancel
            </button>
          </div>

          <ul
            style={{
              listStyle: "none",
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              maxHeight: 320,
              overflowY: "auto",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 6,
              padding: 8,
            }}
          >
            {entries.map((e, i) => (
              <li
                key={`${e.rawName}-${i}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "6px 8px",
                  borderRadius: 4,
                  fontSize: "0.85rem",
                  background: e.matchedShip ? "transparent" : "rgba(245,185,71,0.06)",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>{e.rawName}</span>
                <span style={{ color: e.matchedShip ? "var(--accent)" : "var(--warn)" }}>
                  {e.matchedShip ? `→ ${e.matchedShip.name}` : "no match"}
                </span>
              </li>
            ))}
          </ul>
          {unmatchedCount > 0 && (
            <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", marginTop: 8 }}>
              Unmatched rows are skipped. Most likely cause: the ship name in
              your export is a typo, an alternate name, or a vehicle we
              haven&apos;t catalogued yet (concept ships, paints, etc.).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
