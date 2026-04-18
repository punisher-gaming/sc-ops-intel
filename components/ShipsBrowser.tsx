"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchShips,
  fetchShip,
  formatCrew,
  formatNum,
  uniqueValues,
  type Ship,
} from "@/lib/ships";
import { CURRENT_PATCH } from "./PatchPill";

type SortKey =
  | "name"
  | "manufacturer"
  | "role"
  | "size_class"
  | "hull_hp"
  | "shields_hp"
  | "cargo_scu"
  | "scm_speed";

export function ShipsBrowser() {
  const params = useSearchParams();
  const id = params.get("id");

  if (id) return <ShipDetail id={id} />;
  return <ShipList />;
}

function ShipList() {
  const [ships, setShips] = useState<Ship[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [mfr, setMfr] = useState("");
  const [role, setRole] = useState("");
  const [size, setSize] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    fetchShips()
      .then(setShips)
      .catch((e) => setErr(e.message ?? String(e)));
  }, []);

  const manufacturers = useMemo(
    () => (ships ? uniqueValues(ships, "manufacturer") : []),
    [ships],
  );
  const roles = useMemo(() => (ships ? uniqueValues(ships, "role") : []), [ships]);
  const sizes = useMemo(() => (ships ? uniqueValues(ships, "size_class") : []), [ships]);

  const filtered = useMemo(() => {
    if (!ships) return [];
    const qLower = q.trim().toLowerCase();
    const rows = ships.filter((s) => {
      if (mfr && s.manufacturer !== mfr) return false;
      if (role && s.role !== role) return false;
      if (size && s.size_class !== size) return false;
      if (qLower) {
        const hay = `${s.name} ${s.manufacturer ?? ""} ${s.role ?? ""}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
    const mul = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
      return String(av).localeCompare(String(bv)) * mul;
    });
    return rows;
  }, [ships, q, mfr, role, size, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(typeof ({} as Ship)[key] === "number" ? "desc" : "asc");
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-8">
      <div className="divider">
        <div className="bar" />
        <div className="label">SHIPS</div>
        <div className="bar" />
      </div>

      <div className="tron-card mt-6">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div
            className="font-display font-black text-3xl"
            style={{ letterSpacing: "0.12em", textShadow: "0 0 16px rgba(0,229,255,0.5)" }}
          >
            SHIPS
          </div>
          <div
            className="font-mono border border-amber text-amber px-2 py-0.5"
            style={{ letterSpacing: "0.2em", fontSize: "0.9rem" }}
          >
            PATCH {CURRENT_PATCH}
          </div>
          <div className="font-mono text-phosphor/80 ml-auto" style={{ letterSpacing: "0.12em" }}>
            {ships ? `${filtered.length} / ${ships.length}` : "…"}
          </div>
        </div>

        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
          <Input value={q} onChange={setQ} placeholder="SEARCH NAME / MFR / ROLE" />
          <Select value={mfr} onChange={setMfr} label="MFR" options={manufacturers} />
          <Select value={role} onChange={setRole} label="ROLE" options={roles} />
          <Select value={size} onChange={setSize} label="SIZE" options={sizes} />
        </div>

        {err && (
          <div className="font-mono text-amber mb-4">
            &gt; error loading ships :: {err}
          </div>
        )}

        {!ships && !err && (
          <div className="font-mono text-phosphor">&gt; loading ships database...</div>
        )}

        {ships && (
          <div className="overflow-x-auto">
            <table className="w-full font-mono" style={{ fontSize: "0.9rem", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,229,255,0.3)" }}>
                  <Th label="NAME" k="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="MANUFACTURER" k="manufacturer" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="ROLE" k="role" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="SIZE" k="size_class" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="HULL" k="hull_hp" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} num />
                  <Th label="SHIELDS" k="shields_hp" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} num />
                  <Th label="CARGO" k="cargo_scu" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} num />
                  <Th label="SCM" k="scm_speed" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} num />
                  <th className="text-left py-2 px-2 text-phosphor" style={{ letterSpacing: "0.18em" }}>CREW</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-cyan/5"
                    style={{ borderBottom: "1px solid rgba(0,229,255,0.08)" }}
                  >
                    <td className="py-2 px-2">
                      <Link
                        href={`/ships?id=${encodeURIComponent(s.id)}`}
                        className="text-cyan hover:underline"
                        style={{ textShadow: "0 0 6px rgba(0,229,255,0.4)" }}
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="py-2 px-2 text-bone/80">{s.manufacturer ?? "—"}</td>
                    <td className="py-2 px-2 text-bone/80">{s.role ?? "—"}</td>
                    <td className="py-2 px-2 text-bone/80">{s.size_class ?? "—"}</td>
                    <td className="py-2 px-2 text-right">{formatNum(s.hull_hp)}</td>
                    <td className="py-2 px-2 text-right">{formatNum(s.shields_hp)}</td>
                    <td className="py-2 px-2 text-right">{formatNum(s.cargo_scu)}</td>
                    <td className="py-2 px-2 text-right">{formatNum(s.scm_speed)}</td>
                    <td className="py-2 px-2">{formatCrew(s)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-bone/50">
                      &gt; no ships match filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
  num,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onClick: (k: SortKey) => void;
  num?: boolean;
}) {
  const active = sortKey === k;
  return (
    <th
      className={`py-2 px-2 cursor-pointer select-none ${num ? "text-right" : "text-left"}`}
      style={{
        letterSpacing: "0.18em",
        color: active ? "var(--amber)" : "var(--phosphor)",
        whiteSpace: "nowrap",
      }}
      onClick={() => onClick(k)}
    >
      {label}
      {active && <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="font-mono bg-transparent border border-cyan/30 px-3 py-2 text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan"
      style={{ letterSpacing: "0.1em" }}
    />
  );
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="font-mono bg-ink border border-cyan/30 px-3 py-2 text-bone focus:outline-none focus:border-cyan"
      style={{ letterSpacing: "0.1em" }}
    >
      <option value="">ALL {label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function ShipDetail({ id }: { id: string }) {
  const [ship, setShip] = useState<Ship | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [rawOpen, setRawOpen] = useState(false);

  useEffect(() => {
    fetchShip(id)
      .then(setShip)
      .catch((e) => setErr(e.message ?? String(e)));
  }, [id]);

  if (err) {
    return (
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="tron-card font-mono text-amber">&gt; error :: {err}</div>
      </div>
    );
  }
  if (ship === undefined) {
    return (
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="tron-card font-mono text-phosphor">&gt; loading...</div>
      </div>
    );
  }
  if (ship === null) {
    return (
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="tron-card font-mono text-amber">
          &gt; ship not found :: {id}
          <div className="mt-4">
            <Link href="/ships" className="text-cyan hover:underline">← back to ships</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-8">
      <div className="mb-6">
        <Link href="/ships" className="font-mono text-cyan hover:underline" style={{ letterSpacing: "0.12em" }}>
          ← ALL SHIPS
        </Link>
      </div>

      <div className="tron-card">
        <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
          <div>
            <div
              className="font-display text-4xl font-bold"
              style={{ textShadow: "0 0 12px rgba(0,229,255,0.4)" }}
            >
              {ship.name.toUpperCase()}
            </div>
            <div
              className="font-mono text-phosphor mt-2"
              style={{ letterSpacing: "0.22em" }}
            >
              {(ship.manufacturer ?? "UNKNOWN").toUpperCase()}
            </div>
          </div>
          <div
            className="font-mono border border-magenta px-3 py-1 text-magenta"
            style={{ letterSpacing: "0.2em" }}
          >
            PATCH {ship.game_version ?? CURRENT_PATCH}
          </div>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <Stat label="HULL" value={formatNum(ship.hull_hp)} unit="HP" />
          <Stat label="SHIELDS" value={formatNum(ship.shields_hp)} unit="HP" hot />
          <Stat label="SCM SPEED" value={formatNum(ship.scm_speed)} unit="m/s" />
          <Stat label="MAX SPEED" value={formatNum(ship.max_speed)} unit="m/s" />
          <Stat label="CARGO" value={formatNum(ship.cargo_scu)} unit="SCU" />
          <Stat label="CREW" value={formatCrew(ship)} />
          <Stat label="SIZE" value={ship.size_class ?? "—"} />
          <Stat label="ROLE" value={ship.role ?? "—"} small />
        </div>

        <div className="mt-8 font-mono text-bone/50" style={{ fontSize: "0.85rem", letterSpacing: "0.1em" }}>
          LAST SYNCED :: {ship.last_synced_at ? new Date(ship.last_synced_at).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "—"}
        </div>
      </div>

      {ship.source_data && (
        <div className="tron-card mt-6">
          <button
            onClick={() => setRawOpen((v) => !v)}
            className="font-mono text-phosphor hover:text-cyan"
            style={{ letterSpacing: "0.18em" }}
          >
            {rawOpen ? "▼" : "▶"} RAW SOURCE DATA (SC WIKI API)
          </button>
          {rawOpen && (
            <pre
              className="mt-4 p-4 font-mono overflow-x-auto text-bone/70"
              style={{
                fontSize: "0.78rem",
                background: "rgba(3,3,8,0.6)",
                border: "1px solid rgba(0,229,255,0.15)",
                maxHeight: "600px",
              }}
            >
              {JSON.stringify(ship.source_data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  hot,
  small,
}: {
  label: string;
  value: string;
  unit?: string;
  hot?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className="p-4 border"
      style={{ borderColor: "rgba(0,229,255,0.18)", background: "rgba(10,22,40,0.45)" }}
    >
      <div
        className="font-mono mb-1"
        style={{
          color: hot ? "var(--amber)" : "rgba(0,229,255,0.85)",
          letterSpacing: "0.22em",
          fontSize: "0.95rem",
        }}
      >
        {label}
      </div>
      <div
        className="font-stat font-bold"
        style={{
          fontSize: small ? "1.1rem" : "1.5rem",
          color: hot ? "var(--amber)" : "var(--bone)",
          textShadow: hot ? "0 0 10px var(--amber)" : undefined,
        }}
      >
        {value}
        {unit && value !== "—" && (
          <span className="ml-1 font-normal opacity-50" style={{ fontSize: "0.85rem" }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
