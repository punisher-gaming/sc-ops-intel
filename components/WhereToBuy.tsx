"use client";

import { useEffect, useState } from "react";
import {
  fetchItemShopInventory,
  formatAuecPrice,
  prettyShopLocation,
  type ShopInventoryRow,
} from "@/lib/shops";

// Renders both "Where it's sold" and "Where it's bought" lists for an item
// (weapon or component) based on canonical scunpacked shop inventory data.
// Drops cleanly if the item has no matches.

export function WhereToBuy({ itemReference }: { itemReference: string }) {
  const [rows, setRows] = useState<ShopInventoryRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchItemShopInventory(itemReference)
      .then(setRows)
      .catch((e) => setErr(e.message ?? String(e)));
  }, [itemReference]);

  return (
    <div className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
      <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 12 }}>
        Where to buy / sell
      </div>

      {err && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 6,
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.3)",
            color: "var(--alert)",
            fontSize: "0.85rem",
          }}
        >
          {err}
        </div>
      )}

      {rows === null && !err && (
        <div style={{ color: "var(--text-dim)" }}>Loading shop inventory…</div>
      )}

      {rows && rows.length === 0 && (
        <div style={{ color: "var(--text-dim)", lineHeight: 1.6, fontSize: "0.9rem" }}>
          No shops in the extracted game data carry this item. It may be
          mission-reward-only, not yet stocked by any NPC shop, or a variant
          that isn&apos;t individually sold.
        </div>
      )}

      {rows && rows.length > 0 && (
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
          <Section
            title="Sold at"
            tone="warn"
            rows={rows.filter((r) => r.shop_sells_this)}
          />
          <Section
            title="Bought at"
            tone="success"
            rows={rows.filter((r) => r.shop_buys_this)}
          />
        </div>
      )}
      {rows && rows.some((r) => r.shop_rents_this) && (
        <div style={{ marginTop: 14 }}>
          <Section
            title="Rented at"
            tone="accent"
            rows={rows.filter((r) => r.shop_rents_this)}
          />
        </div>
      )}

      <p style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginTop: 12, lineHeight: 1.5 }}>
        Prices shown are base, in-game shops apply a discount or premium
        based on local stock and demand. Stock levels shown are snapshot at
        ingest time and drift in-game.
      </p>
    </div>
  );
}

function Section({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: "warn" | "success" | "accent";
  rows: ShopInventoryRow[];
}) {
  const color =
    tone === "warn" ? "var(--warn)" : tone === "success" ? "var(--success)" : "var(--accent)";
  const bg =
    tone === "warn" ? "rgba(245,185,71,0.05)"
    : tone === "success" ? "rgba(74,222,128,0.05)"
    : "rgba(77,217,255,0.05)";
  const border =
    tone === "warn" ? "rgba(245,185,71,0.2)"
    : tone === "success" ? "rgba(74,222,128,0.2)"
    : "rgba(77,217,255,0.2)";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div className="accent-label">{title}</div>
        <span className="label-mini">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>None recorded.</div>
      ) : (
        <ul style={{ display: "flex", flexDirection: "column", gap: 6, listStyle: "none", maxHeight: 360, overflowY: "auto" }}>
          {rows.map((r) => (
            <li
              key={r.id}
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                background: bg,
                border: `1px solid ${border}`,
                fontSize: "0.85rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <span style={{ fontWeight: 500, color: "var(--text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.shop?.name ?? "(unknown shop)"}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", color, whiteSpace: "nowrap" }}>
                  {formatAuecPrice(r.base_price)}
                </span>
              </div>
              {r.shop && prettyShopLocation(r.shop) && (
                <div className="label-mini" style={{ marginTop: 4 }}>
                  {prettyShopLocation(r.shop)}
                  {r.inventory_current != null && r.inventory_current > 0 && (
                    <> · stock {Math.round(r.inventory_current).toLocaleString()}</>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
