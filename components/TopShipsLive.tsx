"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchTopShips, formatNum, type Ship } from "@/lib/ships";

export function TopShipsLive() {
  const [ships, setShips] = useState<Ship[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchTopShips(6)
      .then(setShips)
      .catch((e) => setErr(e.message ?? String(e)));
  }, []);

  if (err) {
    return (
      <div className="tron-card font-mono text-amber">
        &gt; failed to load live ships :: {err}
      </div>
    );
  }
  if (!ships) {
    return (
      <div className="tron-card font-mono text-phosphor">
        &gt; loading live data from database...
      </div>
    );
  }
  if (ships.length === 0) {
    return (
      <div className="tron-card font-mono text-bone/70">
        &gt; database empty — run ingest worker
      </div>
    );
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
      {ships.map((s) => (
        <Link
          key={s.id}
          href={`/ships?id=${encodeURIComponent(s.id)}`}
          className="tron-card block hover:border-cyan transition-colors"
          style={{ textDecoration: "none" }}
        >
          <div
            className="font-display text-xl font-bold mb-1"
            style={{ textShadow: "0 0 10px rgba(0,229,255,0.35)" }}
          >
            {s.name.toUpperCase()}
          </div>
          <div
            className="font-mono text-phosphor mb-3"
            style={{ letterSpacing: "0.2em", fontSize: "0.85rem" }}
          >
            {(s.manufacturer ?? "UNKNOWN").toUpperCase()}
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono" style={{ fontSize: "0.85rem" }}>
            <MiniStat label="HULL" value={formatNum(s.hull_hp)} />
            <MiniStat label="SHIELDS" value={formatNum(s.shields_hp)} hot />
            <MiniStat label="SIZE" value={s.size_class ?? "—"} />
            <MiniStat label="CARGO" value={formatNum(s.cargo_scu)} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function MiniStat({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div
      className="p-2 border"
      style={{ borderColor: "rgba(0,229,255,0.15)", background: "rgba(10,22,40,0.4)" }}
    >
      <div
        style={{
          color: hot ? "var(--amber)" : "rgba(0,229,255,0.85)",
          letterSpacing: "0.22em",
          fontSize: "0.7rem",
        }}
      >
        {label}
      </div>
      <div
        className="font-stat font-bold"
        style={{ color: hot ? "var(--amber)" : "var(--bone)", fontSize: "1rem" }}
      >
        {value}
      </div>
    </div>
  );
}
