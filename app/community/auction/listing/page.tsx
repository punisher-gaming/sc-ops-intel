"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { useUser } from "@/lib/supabase/hooks";
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  deleteListing,
  fetchListing,
  formatPrice,
  formatQuantity,
  updateListingStatus,
  type AuctionListing,
} from "@/lib/auction";
import { notifyUser } from "@/lib/notify";
import { MessageButton } from "@/components/MessageButton";

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
      const buyer = soldHandle.trim();
      await updateListingStatus(listing.id, "sold", buyer || undefined);
      setListing({ ...listing, status: "sold", sold_to_handle: buyer || null });
      // Best-effort Discord notification — fires to seller's webhook
      // if they configured one. Non-fatal.
      const priceStr = formatPrice(listing.price_amount, listing.price_currency);
      const wtb = listing.listing_type === "wtb";
      const lines = [
        wtb
          ? `🤝 **Buy request FILLED** — meet your seller in-game!`
          : `🤝 **Listing SOLD** — meet your buyer in-game!`,
        `**Item:** ${listing.item_name}`,
        `**${wtb ? "Budget" : "Price"}:** ${priceStr}${listing.price_per_unit ? " (per unit)" : ""}`,
        ...(buyer ? [`**${wtb ? "Seller" : "Buyer"}:** @${buyer}`] : []),
        `**Listing:** https://citizendex.com/community/auction/listing?id=${listing.id}`,
      ];
      notifyUser(listing.user_id, lines.join("\n")).catch(() => {});
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  // Buyer-side: ping the seller via Discord that you're interested.
  // Runs only when the seller has a webhook configured. Cheap nudge so
  // the seller jumps into Discord and starts the trade conversation.
  const [pingSent, setPingSent] = useState(false);
  const [pingBusy, setPingBusy] = useState(false);
  async function pingSeller() {
    if (!listing || !user) return;
    setPingBusy(true);
    try {
      const buyerHandle =
        // Prefer Discord username from auth metadata so seller knows who to DM
        ((user.user_metadata?.user_name as string | undefined) ||
          (user.user_metadata?.preferred_username as string | undefined) ||
          (user.email as string | undefined) ||
          "a citizen") ?? "a citizen";
      const priceStr = formatPrice(listing.price_amount, listing.price_currency);
      const wtb = listing.listing_type === "wtb";
      const lines = [
        wtb
          ? `📦 **New seller interested in your buy request**`
          : `🛒 **New buyer interested in your auction listing**`,
        `**Item:** ${listing.item_name}`,
        `**${wtb ? "Budget" : "Price"}:** ${priceStr}${listing.price_per_unit ? " (per unit)" : ""}`,
        `**${wtb ? "Seller" : "Buyer"}:** @${buyerHandle}`,
        `**Listing:** https://citizendex.com/community/auction/listing?id=${listing.id}`,
        ``,
        `Reply on Discord to coordinate the in-game meet-up.`,
      ];
      const ok = await notifyUser(listing.user_id, lines.join("\n"));
      if (ok) setPingSent(true);
      else setErr("Seller hasn't set up Discord notifications. Contact them via the handle above.");
    } finally {
      setPingBusy(false);
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
  const t = LISTING_TYPE_LABELS[listing.listing_type];
  const isWtb = listing.listing_type === "wtb";
  const personLabel = isWtb ? "Buyer" : "Seller";

  return (
    <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem", maxWidth: 760 }}>
        <Link href="/community/auction" className="label-mini" style={{ color: "var(--accent)" }}>
          ← Auction House
        </Link>

        <div className="page-header" style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.18em",
                padding: "3px 10px",
                borderRadius: 3,
                background: isWtb ? "rgba(245,185,71,0.12)" : "rgba(74,222,128,0.12)",
                color: t.badgeColor,
                border: `1px solid ${t.badgeColor}40`,
              }}
            >
              {t.badge} · {t.full.toUpperCase()}
            </span>
            <div className="accent-label">{CATEGORY_LABELS[listing.item_category]}</div>
          </div>
          <h1>{listing.item_name}</h1>
          {listing.status !== "active" && (
            <span
              className={`badge ${listing.status === "sold" ? "badge-success" : "badge-muted"}`}
              style={{ marginTop: 8, display: "inline-block" }}
            >
              {listing.status === "sold" ? t.finishedLabel : listing.status.toUpperCase()}
            </span>
          )}
        </div>

        {/* Price + meta block */}
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div className="label-mini">{t.priceLabel}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", color: "var(--accent)", lineHeight: 1.1 }}>
                {formatPrice(listing.price_amount, listing.price_currency)}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                {listing.price_per_unit ? "per unit" : "total for the lot"}
                {(listing.quantity > 1 || listing.unit !== "each") &&
                  ` · ${formatQuantity(listing.quantity, listing.unit)}`}
                {listing.quality_min != null && (
                  <span style={{ marginLeft: 6, color: "var(--warn)" }}>
                    · Q {listing.quality_min}+
                  </span>
                )}
              </div>
              {listing.price_currency !== "aUEC" && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "6px 10px",
                    background: "rgba(255,184,77,0.08)",
                    border: "1px solid rgba(255,184,77,0.25)",
                    borderRadius: 4,
                    color: "var(--warn)",
                    fontSize: "0.78rem",
                  }}
                >
                  🪙 Commodity trade — buyer delivers <strong>{listing.price_currency}</strong>{" "}
                  in-game (typically by SCU at a refinery or trade location)
                </div>
              )}
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

        {/* Seller / buyer card */}
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
          <div className="accent-label" style={{ marginBottom: 8 }}>{personLabel}</div>
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
            <>
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
                💬 {isWtb
                  ? <>To sell: message the buyer on Discord (handle above) or via their CitizenDex profile. Agree on a meet-up in-game, then deliver the item.</>
                  : <>To buy: message the seller on Discord (handle above) or via their CitizenDex profile. Agree on a meet-up location in-game, then trade.</>}{" "}
                <strong>{listing.price_currency === "aUEC"
                  ? "aUEC only — never send real money."
                  : `Trade pays in ${listing.price_currency} in-game — never real money.`}</strong>
              </div>
              {user && !isOwner && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Primary contact path — always works, lands in their
                      CitizenDex inbox AND auto-pushes to their Discord
                      if they have a webhook set up. */}
                  <MessageButton
                    recipientId={listing.user_id}
                    recipientName={sellerName}
                    contextListingId={listing.id}
                    contextLabel={listing.item_name}
                    label={`💬 Message ${personLabel.toLowerCase()} on CitizenDex`}
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                  />
                  {/* Secondary: direct Discord ping (no inbox). Only
                      makes sense if they've configured notifications. */}
                  <button
                    type="button"
                    onClick={pingSeller}
                    disabled={pingBusy || pingSent}
                    className="btn btn-secondary"
                    style={{ width: "100%" }}
                  >
                    {pingSent
                      ? `✓ ${personLabel} pinged on Discord`
                      : pingBusy
                        ? "Pinging…"
                        : `🔔 Quick Discord ping (no message)`}
                  </button>
                  <div className="label-mini" style={{ lineHeight: 1.5 }}>
                    The <strong>blue button</strong> always works — it lands in
                    their CitizenDex inbox and pushes to their Discord too if
                    they&apos;ve set up notifications.{" "}
                    The <strong>quick ping</strong> only works if the{" "}
                    {personLabel.toLowerCase()} has wired up a webhook on
                    their <Link href="/account" style={{ color: "var(--accent)" }}>account page</Link>.
                  </div>
                </div>
              )}
            </>
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
                placeholder={isWtb ? "Seller's Discord handle (optional)" : "Buyer's Discord handle (optional)"}
                className="input"
                style={{ flex: 1, minWidth: 220 }}
              />
              <button
                type="button"
                onClick={markSold}
                disabled={busy}
                className="btn btn-primary"
              >
                Mark {t.finishedLabel}
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
