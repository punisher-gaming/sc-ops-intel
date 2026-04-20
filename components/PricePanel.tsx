"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchPublishedPrices,
  formatAuec,
  priceStats,
  submitPrice,
  type CommodityPrice,
} from "@/lib/commodities";
import { useUser } from "@/lib/supabase/hooks";
import { CURRENT_PATCH } from "./PatchPill";

// Shows published community price reports for a commodity at (optionally) a
// specific trade location, with submission form for logged-in users.
// Mount on either the commodity detail page (pass commodityId only) or a
// trade-location detail (pass both).

export function PricePanel({
  commodityId,
  commodityName,
  locationId,
  locationName,
  // When true, renders as a compact inline strip (for lists);
  // otherwise a full card with submission form.
  compact = false,
}: {
  commodityId: string;
  commodityName?: string;
  locationId?: string;
  locationName?: string;
  compact?: boolean;
}) {
  const { user } = useUser();
  const [prices, setPrices] = useState<CommodityPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const rows = await fetchPublishedPrices(commodityId, locationId);
      setPrices(rows);
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commodityId, locationId]);

  const buyPrices = prices.filter((p) => p.kind === "buy");
  const sellPrices = prices.filter((p) => p.kind === "sell");
  const buy = priceStats(buyPrices);
  const sell = priceStats(sellPrices);

  if (compact) {
    return (
      <div style={{ display: "flex", gap: 16, fontSize: "0.8rem", color: "var(--text-muted)" }}>
        {buy.median != null && (
          <span>
            Buy: <span style={{ color: "var(--warn)", fontFamily: "var(--font-mono)" }}>{formatAuec(buy.median)}</span>{" "}
            <span className="label-mini">({buy.count})</span>
          </span>
        )}
        {sell.median != null && (
          <span>
            Sell: <span style={{ color: "var(--success)", fontFamily: "var(--font-mono)" }}>{formatAuec(sell.median)}</span>{" "}
            <span className="label-mini">({sell.count})</span>
          </span>
        )}
        {buy.median == null && sell.median == null && (
          <span style={{ color: "var(--text-dim)" }}>No prices logged yet</span>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>Community prices</div>
          <div className="label-mini" style={{ marginTop: 4 }}>
            Reported by Punisher Gaming members · live in-game prices
          </div>
        </div>
        {locationId && user ? (
          <button className={showForm ? "btn btn-secondary" : "btn btn-primary"} onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Log price"}
          </button>
        ) : locationId && !user ? (
          <Link href="/login" className="btn btn-secondary">Sign in to log a price</Link>
        ) : null}
      </div>

      {showForm && user && locationId && (
        <PriceForm
          userId={user.id}
          commodityId={commodityId}
          commodityName={commodityName}
          locationId={locationId}
          locationName={locationName}
          onDone={() => {
            setShowForm(false);
            reload();
          }}
        />
      )}

      {err && (
        <div style={{ padding: "10px 12px", borderRadius: 6, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", color: "var(--alert)", fontSize: "0.85rem", marginBottom: 12 }}>
          {err}
        </div>
      )}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
        <StatBlock label="Buy from terminal" tone="warn" stats={buy} />
        <StatBlock label="Sell to terminal" tone="success" stats={sell} />
      </div>

      {loading && prices.length === 0 && <div style={{ color: "var(--text-dim)" }}>Loading…</div>}

      {!loading && prices.length === 0 && (
        <div style={{ color: "var(--text-dim)", padding: "0.5rem 0" }}>
          No community prices logged yet{locationId ? " here" : ""}.
          {user && locationId && " Be the first, click Log price above."}
        </div>
      )}

      {prices.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
          {prices.slice(0, 30).map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "8px 12px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontSize: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`badge ${p.kind === "buy" ? "badge-warn" : "badge-success"}`} style={{ fontSize: "0.7rem" }}>
                  {p.kind.toUpperCase()}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", color: p.kind === "buy" ? "var(--warn)" : "var(--success)" }}>
                  {formatAuec(p.price_auec)}
                </span>
                {p.stock_scu != null && (
                  <span className="label-mini">{p.stock_scu} SCU</span>
                )}
              </div>
              <span className="label-mini">
                {new Date(p.reported_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBlock({
  label,
  tone,
  stats,
}: {
  label: string;
  tone: "warn" | "success";
  stats: ReturnType<typeof priceStats>;
}) {
  const color = tone === "warn" ? "var(--warn)" : "var(--success)";
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 6,
        background: tone === "warn" ? "rgba(245,185,71,0.05)" : "rgba(74,222,128,0.05)",
        border: `1px solid ${tone === "warn" ? "rgba(245,185,71,0.2)" : "rgba(74,222,128,0.2)"}`,
      }}
    >
      <div className="label-mini">{label}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 600, fontFamily: "var(--font-mono)", color, marginTop: 4 }}>
        {stats.median != null ? formatAuec(stats.median) : ", "}
      </div>
      {stats.count > 0 && (
        <div style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginTop: 4 }}>
          median · {stats.count} report{stats.count === 1 ? "" : "s"}
          {stats.min != null && stats.max != null && stats.min !== stats.max && (
            <> · {formatAuec(stats.min)} – {formatAuec(stats.max)}</>
          )}
        </div>
      )}
    </div>
  );
}

function PriceForm({
  userId,
  commodityId,
  commodityName,
  locationId,
  locationName,
  onDone,
}: {
  userId: string;
  commodityId: string;
  commodityName?: string;
  locationId: string;
  locationName?: string;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<"buy" | "sell">("sell");
  const [priceStr, setPriceStr] = useState("");
  const [stockStr, setStockStr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(priceStr.replace(/[,\s]/g, ""));
    if (!Number.isFinite(price) || price < 0) {
      setErr("Enter a valid price (numbers only, aUEC).");
      return;
    }
    const stock = stockStr ? Number(stockStr) : undefined;
    setBusy(true);
    setErr(null);
    try {
      await submitPrice({
        user_id: userId,
        commodity_id: commodityId,
        trade_location_id: locationId,
        kind,
        price_auec: price,
        stock_scu: stock,
        note: note.trim() || undefined,
        game_version: CURRENT_PATCH,
      });
      onDone();
    } catch (e) {
      setErr((e as Error).message ?? String(e));
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handle}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "1rem",
        marginBottom: 16,
        borderRadius: 6,
        background: "rgba(77,217,255,0.04)",
        border: "1px solid rgba(77,217,255,0.2)",
      }}
    >
      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
        {commodityName && <>Commodity: <span style={{ color: "var(--text)", fontWeight: 500 }}>{commodityName}</span> · </>}
        {locationName && <>Location: <span style={{ color: "var(--text)", fontWeight: 500 }}>{locationName}</span></>}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => setKind("buy")}
          className={kind === "buy" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ flex: 1 }}
        >
          Buying from terminal
        </button>
        <button
          type="button"
          onClick={() => setKind("sell")}
          className={kind === "sell" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ flex: 1 }}
        >
          Selling to terminal
        </button>
      </div>

      <label>
        <div className="label-mini" style={{ marginBottom: 6 }}>
          Price per SCU (aUEC) <span style={{ color: "var(--alert)" }}>*</span>
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={priceStr}
          onChange={(e) => setPriceStr(e.target.value)}
          required
          placeholder="e.g. 27,500"
          className="input"
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

      <label>
        <div className="label-mini" style={{ marginBottom: 6 }}>Stock available (SCU)</div>
        <input
          type="text"
          inputMode="numeric"
          value={stockStr}
          onChange={(e) => setStockStr(e.target.value)}
          placeholder="optional"
          className="input"
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </label>

      <label>
        <div className="label-mini" style={{ marginBottom: 6 }}>Note</div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="Anything useful, time of day, demand level, etc."
          className="input"
        />
      </label>

      {err && (
        <div style={{ padding: "10px 12px", borderRadius: 6, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", color: "var(--alert)", fontSize: "0.85rem" }}>
          {err}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={busy || !priceStr}>
          {busy ? "Submitting…" : "Submit price"}
        </button>
        <div style={{ color: "var(--text-dim)", fontSize: "0.8rem", alignSelf: "center" }}>
          Published after moderator review.
        </div>
      </div>
    </form>
  );
}
