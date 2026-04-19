"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { useUser } from "@/lib/supabase/hooks";
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  fetchMyListings,
  formatPrice,
  type AuctionListing,
} from "@/lib/auction";

export default function MyListingsPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [listings, setListings] = useState<AuctionListing[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/community/auction/mine");
      return;
    }
    if (user) {
      fetchMyListings(user.id)
        .then(setListings)
        .catch((e) => setErr((e as Error).message ?? String(e)));
    }
  }, [loading, user, router]);

  return (
    <PageShell>
      <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem", maxWidth: 920 }}>
        <Link href="/community/auction" className="label-mini" style={{ color: "var(--accent)" }}>
          ← Auction House
        </Link>
        <div className="page-header" style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="accent-label">Your shop</div>
            <h1>My listings</h1>
          </div>
          <Link href="/community/auction/new" className="btn btn-primary">+ New listing</Link>
        </div>

        {err && (
          <div style={{ padding: "10px 14px", borderRadius: 6, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", color: "var(--alert)", fontSize: "0.85rem", marginBottom: 14 }}>
            {err}
          </div>
        )}

        {listings === null && !err && (
          <div style={{ color: "var(--text-muted)" }}>Loading…</div>
        )}
        {listings && listings.length === 0 && (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
            You don&apos;t have any listings yet.{" "}
            <Link href="/community/auction/new" style={{ color: "var(--accent)" }}>List your first item</Link>.
          </div>
        )}
        {listings && listings.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {listings.map((l) => (
              <Link
                key={l.id}
                href={`/community/auction/listing?id=${encodeURIComponent(l.id)}`}
                className="card card-hover"
                style={{ padding: "1rem 1.25rem", display: "block", textDecoration: "none", color: "var(--text)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.62rem",
                          letterSpacing: "0.18em",
                          padding: "1px 8px",
                          borderRadius: 3,
                          color: LISTING_TYPE_LABELS[l.listing_type].badgeColor,
                          background: l.listing_type === "wts" ? "rgba(74,222,128,0.12)" : "rgba(245,185,71,0.12)",
                          border: `1px solid ${LISTING_TYPE_LABELS[l.listing_type].badgeColor}40`,
                        }}
                      >
                        {LISTING_TYPE_LABELS[l.listing_type].badge}
                      </span>
                      <span className="label-mini">{CATEGORY_LABELS[l.item_category]}</span>
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--accent)", marginTop: 4 }}>{l.item_name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem" }}>{formatPrice(l.price_amount, l.price_currency)}</div>
                    <div className="label-mini" style={{ marginTop: 2 }}>
                      {l.price_per_unit ? "per unit" : "total"}
                      {l.quantity > 1 && ` · qty ${l.quantity}`}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span
                    className={`badge ${l.status === "active" ? "badge-accent" : l.status === "sold" ? "badge-success" : "badge-muted"}`}
                    style={{ fontSize: "0.65rem" }}
                  >
                    {l.status.toUpperCase()}
                  </span>
                  <span className="label-mini">
                    Listed {new Date(l.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
