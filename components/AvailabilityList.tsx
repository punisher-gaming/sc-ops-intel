"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchAvailabilityForCommodity,
  fetchAvailabilityForLocation,
  prettyKind,
  type CommodityAvailabilityRow,
} from "@/lib/commodities";

// Two modes:
//   <AvailabilityList commodityId={...} />  , shows trade locations that
//       sell or buy this commodity
//   <AvailabilityList locationId={...} />   , shows commodities this
//       terminal sells or buys

export function AvailabilityList({
  commodityId,
  locationId,
}: {
  commodityId?: string;
  locationId?: string;
}) {
  const [rows, setRows] = useState<CommodityAvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = commodityId
          ? await fetchAvailabilityForCommodity(commodityId)
          : locationId
            ? await fetchAvailabilityForLocation(locationId)
            : [];
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [commodityId, locationId]);

  const sold = rows.filter((r) => r.kind === "sold");
  const bought = rows.filter((r) => r.kind === "bought");

  if (err) {
    return (
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 6,
          background: "rgba(255,107,107,0.08)",
          border: "1px solid rgba(255,107,107,0.3)",
          color: "var(--alert)",
        }}
      >
        {err}
      </div>
    );
  }

  if (loading) {
    return <div style={{ color: "var(--text-dim)" }}>Loading availability…</div>;
  }

  if (rows.length === 0) {
    return (
      <div style={{ color: "var(--text-dim)", padding: "0.5rem 0" }}>
        No availability data for this {commodityId ? "commodity" : "location"} yet.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
      <Section
        title={commodityId ? "Where it's sold" : "This terminal sells"}
        tone="warn"
        rows={sold}
        mode={commodityId ? "location" : "commodity"}
      />
      <Section
        title={commodityId ? "Where it's bought" : "This terminal buys"}
        tone="success"
        rows={bought}
        mode={commodityId ? "location" : "commodity"}
      />
    </div>
  );
}

function Section({
  title,
  tone,
  rows,
  mode,
}: {
  title: string;
  tone: "warn" | "success";
  rows: CommodityAvailabilityRow[];
  mode: "location" | "commodity";
}) {
  return (
    <div className="card" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>{title}</div>
        <span className={`badge ${tone === "warn" ? "badge-warn" : "badge-success"}`} style={{ fontSize: "0.7rem" }}>
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>None recorded.</div>
      ) : (
        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            listStyle: "none",
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {rows.map((r) => {
            if (mode === "location" && r.trade_location) {
              const loc = r.trade_location;
              return (
                <li
                  key={r.id}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <Link href={`/trade-locations?id=${encodeURIComponent(loc.id)}`} style={{ color: "var(--accent)", fontWeight: 500, fontSize: "0.9rem" }}>
                    {loc.name}
                  </Link>
                  <div className="label-mini" style={{ marginTop: 2 }}>
                    {[loc.system, loc.planet, loc.kind ? prettyKind(loc.kind) : null].filter(Boolean).join(" · ")}
                  </div>
                </li>
              );
            }
            if (mode === "commodity" && r.commodity) {
              const c = r.commodity;
              return (
                <li
                  key={r.id}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <Link href={`/commodities?id=${encodeURIComponent(c.id)}`} style={{ color: "var(--accent)", fontWeight: 500, fontSize: "0.9rem" }}>
                    {c.name}
                  </Link>
                  {c.kind && (
                    <div className="label-mini" style={{ marginTop: 2 }}>
                      {prettyKind(c.kind)}
                    </div>
                  )}
                </li>
              );
            }
            return null;
          })}
        </ul>
      )}
    </div>
  );
}
