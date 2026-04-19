"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { useUser } from "@/lib/supabase/hooks";
import {
  CATEGORY_LABELS,
  deleteListing,
  fetchListing,
  formatAuec,
  updateListingStatus,
  type AuctionListing,
} from "@/lib/auction";

// Listing detail. Anyone can view (RLS lets anon SELECT active rows;
// the owner can also see their non-active ones). Owner sees Edit-style
// actions (mark sold, cancel, delete). Visitors see a "Contact seller"
// button that links to the seller's profile + their Discord handle so
// the trade can happen on Discord.
//
// Static-export-safe via ?id= query param (vs a dynamic [id] route).

export default function ListingDetailPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>Loading…</div>}>
        <ListingDetail />
      </Suspense>
    </PageShell>
  );
}

function ListingDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const id = params?.get("id") ?? "";
  const [listing, setListing] = useState<AuctionListing | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [soldHandle, setSoldHandle] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchListing(id)
      .then(setListing)
      .catch((e) => setErr((e as Error).message ?? String(e)));
  }, [id]);

  async function markSold() {
    if (!listing) return;
    setBusy(true);
    try {
      await updateListingStatus(listing.id, "sold", soldHandle.trim() || undefined);
      setListing({ ...listing, status: "sold", sold_to_handle: soldHandle.trim() || null });
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    } finally {
      setBusy(false);
    }
  }
  async function cancelListing() {
    if (!listing) return;
    if (!confirm("Cancel this listing?")) return;
    setBusy(true);
    try {
      await updateListingStatus(listing.id, "cancelled");
      setListing({ ...listing, status: "cancelled" });
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    } finally {
      setBusy(false);
    }
  }
  async function removeListing() {
    if (!listing) return;
    if (!confirm("Permanently delete this listing? This can't be undone.")) return;
    setBusy(true);
    try {
      await deleteListing(listing.id);
      router.push("/community/auction");
    } catch (e) {
      setErr((e as Error).message ?? String(e));
      setBusy(false);
    }
  }

  if (listing === undefined) {
    return (
      <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
        Loading listing…
      </div>
    );
  }

  if (listing === null) {
    return (
      <div className="container" style={{ paddingTop: "3rem" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ color: "var(--alert)", marginBottom: 12 }}>Listing not found</div>
          <Link href="/community/auction" style={{ color: "var(--accent)" }}>← Back to auction</Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === listing.user_id;
  const sellerName = listing.seller_display_name ?? "Citizen";

  return (
    <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem", maxWidth: 760 }}>
        <Link href="/community/auction" className="label-mini" style={{ color: "var(--accent)" }}>
          ← Auction House
        </Link>

        <div className="page-header" style={{ marginTop: 8 }}>
          <div className="accent-label">{CATEGORY_LABELS[listing.item_category]}</div>
          <h1>{listing.item_name}</h1>
          {listing.status !== "active" && (
            <span
              className={`badge ${listing.status === "sold" ? "badge-success" : "badge-muted"}`}
              style={{ marginTop: 8, display: "inline-block" }}
            >
              {listing.status.toUpperCase()}
            </span>
          )}
        </div>

        {/* Price + meta block */}
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div className="label-mini">Asking price</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", color: "var(--accent)", lineHeight: 1.1 }}>
                {formatAuec(listing.price_auec)}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                {listing.price_per_unit ? "per unit" : "total for the lot"}
                {listing.quantity > 1 && ` · qty ${listing.quantity}`}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="label-mini">Listed</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {new Date(listing.created_at).toLocaleDateString()}
              </div>
              <div className="label-mini" style={{ marginTop: 6 }}>Expires</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {new Date(listing.expires_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          {listing.condition && (
            <div style={{ marginTop: 14, color: "var(--text)", fontSize: "0.9rem" }}>
              <strong style={{ color: "var(--text-muted)" }}>Condition:</strong> {listing.condition}
            </div>
          )}
          {listing.description && (
            <p style={{ marginTop: 14, color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: "0.95rem" }}>
              {listing.description}
            </p>
          )}
        </div>

        {/* Seller card */}
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
          <div className="accent-label" style={{ marginBottom: 8 }}>Seller</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <Link
                href={`/profile?id=${encodeURIComponent(listing.user_id)}`}
                style={{ fontSize: "1rem", fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}
              >
                {sellerName}
              </Link>
              {listing.seller_discord && (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                  Discord: <strong>@{listing.seller_discord}</strong>
                </div>
              )}
            </div>
            <Link
              href={`/profile?id=${encodeURIComponent(listing.user_id)}`}
              className="btn btn-secondary"
            >
              View profile
            </Link>
          </div>
          {!isOwner && listing.status === "active" && (
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                borderRadius: 6,
                background: "rgba(77,217,255,0.06)",
                border: "1px solid rgba(77,217,255,0.2)",
                fontSize: "0.88rem",
                color: "var(--text)",
                lineHeight: 1.55,
              }}
            >
              💬 To buy: message the seller on Discord (handle above) or via
              their CitizenDex profile. Agree on a meet-up location in-game,
              then trade. <strong>aUEC only — never send real money.</strong>
            </div>
          )}
        </div>

        {/* Owner controls */}
        {isOwner && listing.status === "active" && (
          <div className="card" style={{ padding: "1.5rem" }}>
            <div className="accent-label" style={{ marginBottom: 12 }}>Manage your listing</div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <input
                type="text"
                value={soldHandle}
                onChange={(e) => setSoldHandle(e.target.value)}
                placeholder="Buyer's Discord handle (optional)"
                className="input"
                style={{ flex: 1, minWidth: 220 }}
              />
              <button
                type="button"
                onClick={markSold}
                disabled={busy}
                className="btn btn-primary"
              >
                Mark SOLD
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={cancelListing}
                disabled={busy}
                className="btn btn-secondary"
              >
                Cancel listing
              </button>
              <button
                type="button"
                onClick={removeListing}
                disabled={busy}
                className="btn btn-ghost"
                style={{ color: "var(--alert)" }}
              >
                Delete permanently
              </button>
            </div>
          </div>
        )}

        {err && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
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
      </div>
  );
}
