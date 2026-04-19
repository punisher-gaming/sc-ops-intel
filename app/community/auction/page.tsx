"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  fetchActiveListings,
  fetchCurrencyOptions,
  formatPrice,
  formatQuantity,
  type AuctionCategory,
  type AuctionListing,
  type CurrencyOption,
  type ListingType,
} from "@/lib/auction";
import { useUser } from "@/lib/supabase/hooks";

export default function AuctionHomePage() {
  const { user } = useUser();
  const [listings, setListings] = useState<AuctionListing[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [category, setCategory] = useState<AuctionCategory | "">("");
  const [currency, setCurrency] = useState<string>("");
  const [listingType, setListingType] = useState<ListingType | "all">("all");
  const [currencyOpts, setCurrencyOpts] = useState<CurrencyOption[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce the search field so we don't hammer Supabase per keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchCurrencyOptions().then(setCurrencyOpts).catch(() => {});
  }, []);

  useEffect(() => {
    setListings(null);
    fetchActiveListings({
      category: category || undefined,
      currency: currency || undefined,
      listingType: listingType === "all" ? undefined : listingType,
      search: debouncedSearch || undefined,
    })
      .then(setListings)
      .catch((e) => setErr((e as Error).message ?? String(e)));
  }, [category, currency, listingType, debouncedSearch]);

  return (
    <PageShell>
      <div className="container-wide" style={{ paddingTop: "2.5rem", paddingBottom: "4rem" }}>
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <Link href="/community" className="label-mini" style={{ color: "var(--accent)" }}>
              ← Community
            </Link>
            <div className="accent-label" style={{ marginTop: 8 }}>Auction House</div>
            <h1>User-to-User Trading</h1>
            <p style={{ maxWidth: "62ch" }}>
              Two-sided marketplace.{" "}
              <strong style={{ color: "var(--success)" }}>WTS</strong> = want to sell,{" "}
              <strong style={{ color: "var(--warn)" }}>WTB</strong> = want to buy.
              Pay in <strong>aUEC</strong> or any in-game{" "}
              <strong>commodity</strong> (Gold, Quantanium, etc.). Trades happen
              in-game — this is a listing board, not a payment system.
              Real-money transactions are{" "}
              <strong style={{ color: "var(--alert)" }}>strictly prohibited</strong>.
            </p>
          </div>
          {user ? (
            <Link href="/community/auction/new" className="btn btn-primary">
              + New listing
            </Link>
          ) : (
            <Link href="/login" className="btn btn-secondary">
              Sign in to list
            </Link>
          )}
        </div>

        {/* WTS / WTB tabs — pinned at top so the two sides are obvious */}
        <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", marginBottom: 16 }}>
          {(["all", "wts", "wtb"] as const).map((m) => {
            const labels: Record<typeof m, string> = {
              all: "All listings",
              wts: "🟢 WTS · Selling",
              wtb: "🟡 WTB · Buying",
            };
            return (
              <button
                key={m}
                type="button"
                onClick={() => setListingType(m)}
                className={listingType === m ? "btn btn-primary" : "btn btn-ghost"}
                style={{ height: 32, padding: "0 14px", fontSize: "0.82rem" }}
              >
                {labels[m]}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="input"
            style={{ flex: "1 1 280px", minWidth: 240 }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as AuctionCategory | "")}
            className="select"
            style={{ width: 180 }}
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="select"
            style={{ width: 200 }}
            title="Filter by accepted currency"
          >
            <option value="">All currencies</option>
            {currencyOpts.map((c) => (
              <option key={c.value} value={c.value}>
                {c.isAuec ? "💰 aUEC" : `🪙 ${c.label}`}
              </option>
            ))}
          </select>
          {user && (
            <Link href="/community/auction/mine" className="btn btn-ghost" style={{ alignSelf: "center" }}>
              My listings
            </Link>
          )}
        </div>

        {err && <ErrorBar text={err} />}

        {listings === null && !err && (
          <div style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Loading auction…</div>
        )}

        {listings && listings.length === 0 && !err && (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
            No active listings match. {user && <>Be the first to list — <Link href="/community/auction/new" style={linkStyle}>create one</Link>.</>}
          </div>
        )}

        {listings && listings.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            }}
          >
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}

        <p style={{ marginTop: "2.5rem", color: "var(--text-dim)", fontSize: "0.78rem", lineHeight: 1.6, maxWidth: "70ch" }}>
          ⓘ This board is moderated. Listings selling for real money,
          asking for cash equivalents, or attempting to RMT will be
          removed and the seller&apos;s account flagged. Always meet
          your trade partner in-game; never wire funds outside the game.
        </p>
      </div>
    </PageShell>
  );
}

function ListingCard({ listing }: { listing: AuctionListing }) {
  const sellerName = listing.seller_display_name ?? "Citizen";
  const t = LISTING_TYPE_LABELS[listing.listing_type];
  const isWtb = listing.listing_type === "wtb";
  return (
    <Link
      href={`/community/auction/listing?id=${encodeURIComponent(listing.id)}`}
      className="card card-hover"
      style={{
        padding: "1.25rem", display: "block", textDecoration: "none", color: "var(--text)",
        // Subtle left-border in the listing-type colour so WTB and WTS
        // are scannable at a glance from the grid.
        borderLeft: `3px solid ${t.badgeColor}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.65rem",
            letterSpacing: "0.18em",
            padding: "2px 8px",
            borderRadius: 3,
            background: isWtb ? "rgba(245,185,71,0.12)" : "rgba(74,222,128,0.12)",
            color: t.badgeColor,
            border: `1px solid ${t.badgeColor}40`,
          }}
        >
          {t.badge}
        </span>
        <span className="label-mini">{CATEGORY_LABELS[listing.item_category]}</span>
      </div>
      <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--accent)", marginBottom: 4 }}>
        {listing.item_name}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", color: "var(--text)" }}>
            {formatPrice(listing.price_amount, listing.price_currency)}
          </div>
          <div className="label-mini" style={{ marginTop: 2 }}>
            {isWtb ? "buying budget" : listing.price_per_unit ? "per unit" : "total"}
            {(listing.quantity > 1 || listing.unit !== "each") &&
              ` · ${formatQuantity(listing.quantity, listing.unit)}`}
            {listing.quality_min != null && (
              <span style={{ marginLeft: 6, color: "var(--warn)" }}>· Q {listing.quality_min}+</span>
            )}
            {listing.price_currency !== "aUEC" && (
              <span style={{ marginLeft: 6, color: "var(--accent)" }}>· {listing.price_currency}</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="label-mini">{isWtb ? "Buyer" : "Seller"}</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{sellerName}</div>
        </div>
      </div>
      {listing.condition && (
        <div className="label-mini" style={{ marginTop: 10 }}>
          ⛯ {listing.condition}
        </div>
      )}
    </Link>
  );
}

function ErrorBar({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 6,
        background: "rgba(255,107,107,0.08)",
        border: "1px solid rgba(255,107,107,0.3)",
        color: "var(--alert)",
        fontSize: "0.85rem",
        marginBottom: 14,
      }}
    >
      {text}
    </div>
  );
}

const linkStyle = { color: "var(--accent)", textDecoration: "none" };
