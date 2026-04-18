"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchAvailabilityForLocation,
  type CommodityAvailabilityRow,
} from "@/lib/commodities";
import { PricePanel } from "./PricePanel";

// On a trade-location detail page, lets the user pick one of this
// terminal's known commodities and see its published price history +
// submit a new price. Just a wrapper that routes the right commodity
// through <PricePanel /> once picked.

export function TradeLocationPrices({
  locationId,
  locationName,
}: {
  locationId: string;
  locationName: string;
}) {
  const [rows, setRows] = useState<CommodityAvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAvailabilityForLocation(locationId)
      .then((r) => {
        if (!cancelled) {
          setRows(r);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  // Deduplicate commodities in this location (sold + bought may overlap)
  const commodities = Array.from(
    new Map(
      rows
        .filter((r) => r.commodity)
        .map((r) => [r.commodity!.id, r.commodity!]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  if (loading) return null;
  if (commodities.length === 0) {
    return (
      <div className="card" style={{ padding: "1.5rem", marginTop: "1rem" }}>
        <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 8 }}>Prices</div>
        <div style={{ color: "var(--text-dim)" }}>
          No commodities recorded for this location — nothing to price yet.
        </div>
      </div>
    );
  }

  const picked = commodities.find((c) => c.id === pickedId);

  return (
    <div className="card" style={{ padding: "1.5rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>Prices at this terminal</div>
          <div className="label-mini" style={{ marginTop: 4 }}>
            Pick a commodity to see logged prices or submit a new one
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {commodities.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setPickedId(c.id === pickedId ? null : c.id)}
            style={{
              padding: "5px 10px",
              borderRadius: 14,
              fontSize: "0.8rem",
              cursor: "pointer",
              background: c.id === pickedId ? "rgba(77,217,255,0.15)" : "rgba(255,255,255,0.04)",
              color: c.id === pickedId ? "var(--accent)" : "var(--text-muted)",
              border: `1px solid ${c.id === pickedId ? "rgba(77,217,255,0.45)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {picked ? (
        <PricePanel
          commodityId={picked.id}
          commodityName={picked.name}
          locationId={locationId}
          locationName={locationName}
        />
      ) : (
        <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
          Select a commodity above.{" "}
          <Link href="/commodities" style={{ color: "var(--accent)" }}>
            Or view all commodities →
          </Link>
        </div>
      )}
    </div>
  );
}
