"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { useUser } from "@/lib/supabase/hooks";
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  createListing,
  fetchCurrencyOptions,
  type AuctionCategory,
  type CurrencyOption,
  type ListingType,
} from "@/lib/auction";

export default function NewListingPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  // Default to WTS since most listings are sales. Toggle at the top
  // of the form lets the user post a buy request instead.
  const [listingType, setListingType] = useState<ListingType>("wts");
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState<AuctionCategory>("ship");
  const [quantity, setQuantity] = useState(1);
  const [priceAmount, setPriceAmount] = useState<number>(0);
  const [priceCurrency, setPriceCurrency] = useState<string>("aUEC");
  const [pricePerUnit, setPricePerUnit] = useState(false);
  const [durationDays, setDurationDays] = useState<number>(30);
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Currency options pulled from the live commodities catalog (+ aUEC)
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([
    { value: "aUEC", label: "aUEC (in-game credits)", isAuec: true },
  ]);
  useEffect(() => {
    fetchCurrencyOptions().then(setCurrencies).catch(() => { /* keep default */ });
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/community/auction/new");
    }
  }, [loading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!itemName.trim()) {
      setErr("Item name is required.");
      return;
    }
    if (priceAmount < 0) {
      setErr("Price can't be negative.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const listing = await createListing({
        user_id: user.id,
        listing_type: listingType,
        item_name: itemName.trim(),
        item_category: category,
        quantity,
        price_amount: Math.round(priceAmount),
        price_currency: priceCurrency,
        price_per_unit: pricePerUnit,
        duration_days: durationDays,
        condition: condition.trim() || undefined,
        description: description.trim() || undefined,
      });
      router.push(`/community/auction/listing?id=${encodeURIComponent(listing.id)}`);
    } catch (e) {
      setErr((e as Error).message ?? String(e));
      setBusy(false);
    }
  }

  // Group commodities by kind so the dropdown is browsable. aUEC stays
  // pinned at the top.
  const grouped = (() => {
    const auec = currencies.filter((c) => c.isAuec);
    const rest = currencies.filter((c) => !c.isAuec);
    const byKind = new Map<string, CurrencyOption[]>();
    for (const c of rest) {
      const k = c.kind?.trim() || "Other";
      if (!byKind.has(k)) byKind.set(k, []);
      byKind.get(k)!.push(c);
    }
    return { auec, byKind };
  })();

  return (
    <PageShell>
      <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem", maxWidth: 720 }}>
        <Link href="/community/auction" className="label-mini" style={{ color: "var(--accent)" }}>
          ← Auction House
        </Link>
        <div className="page-header" style={{ marginTop: 8 }}>
          <div className="accent-label">New Listing</div>
          <h1>{LISTING_TYPE_LABELS[listingType].cta}</h1>
          <p>
            {listingType === "wts" ? (
              <>Accept payment in <strong>aUEC</strong> or any in-game{" "}
              <strong>commodity</strong> (Gold, Quantanium, Tungsten, etc.).</>
            ) : (
              <>Tell other citizens what you&apos;re looking to buy and what
              you&apos;ll pay for it. Sellers will contact you in Discord
              to coordinate the trade.</>
            )}{" "}
            <strong style={{ color: "var(--alert)" }}>No real money.</strong>{" "}
            The actual trade happens in-game.
          </p>
        </div>

        <form onSubmit={submit} className="card" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* WTS / WTB toggle — drives all the dynamic labels below */}
          <Field label="Listing type *">
            <div style={{ display: "flex", gap: 8 }}>
              {(["wts", "wtb"] as const).map((t) => {
                const meta = LISTING_TYPE_LABELS[t];
                const active = listingType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setListingType(t)}
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      borderRadius: 6,
                      border: `1px solid ${active ? meta.badgeColor : "rgba(255,255,255,0.12)"}`,
                      background: active
                        ? (t === "wts" ? "rgba(74,222,128,0.1)" : "rgba(245,185,71,0.1)")
                        : "rgba(255,255,255,0.03)",
                      color: active ? meta.badgeColor : "var(--text-muted)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.18em" }}>
                      {meta.badge}
                    </div>
                    <div style={{ marginTop: 3, fontSize: "0.92rem", fontWeight: 600 }}>
                      {meta.full}
                    </div>
                    <div style={{ marginTop: 2, fontSize: "0.72rem", color: "var(--text-dim)" }}>
                      {t === "wts" ? "I have it, looking to sell" : "I want it, looking to buy"}
                    </div>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Item name *">
            <input
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder={
                listingType === "wts"
                  ? "e.g. Drake Cutlass Black, FS-9 LMG, microTech Frostbite paint"
                  : "e.g. Aegis Idris-M, 100x SCU Quantanium, Polaris BUK kit"
              }
              maxLength={120}
              className="input"
            />
          </Field>

          <Field label="Category *">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AuctionCategory)}
              className="select"
            >
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
            <Field label="Quantity">
              <input
                type="number"
                min={1}
                max={9999}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="input"
              />
            </Field>
            <Field label={`${LISTING_TYPE_LABELS[listingType].priceLabel} *`}>
              <input
                type="number"
                min={0}
                step={1}
                required
                value={priceAmount}
                onChange={(e) => setPriceAmount(parseFloat(e.target.value) || 0)}
                placeholder="500000"
                className="input"
              />
            </Field>
          </div>

          <Field label="Currency *">
            <select
              value={priceCurrency}
              onChange={(e) => setPriceCurrency(e.target.value)}
              className="select"
            >
              {grouped.auec.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
              {Array.from(grouped.byKind.entries()).map(([kind, opts]) => (
                <optgroup key={kind} label={kind}>
                  {opts.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="label-mini" style={{ marginTop: 4 }}>
              {priceCurrency === "aUEC"
                ? "Buyer pays in in-game credits."
                : `Buyer pays in ${priceCurrency} — typically traded in SCU at a refinery or trade location.`}
            </div>
          </Field>

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.9rem", color: "var(--text-muted)" }}>
            <input
              type="checkbox"
              checked={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.checked)}
              style={{ accentColor: "var(--accent)" }}
            />
            Price is <strong>per unit</strong> (otherwise it&apos;s the total for the lot)
          </label>

          <Field label="Listing duration *">
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
              className="select"
            >
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days (default)</option>
            </select>
            <div className="label-mini" style={{ marginTop: 4 }}>
              Auto-expires after this period. You can also cancel or
              mark sold any time from the listing detail page.
            </div>
          </Field>

          <Field label="Condition (optional)">
            <input
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g. New, Used, LTI, 6-month insurance"
              maxLength={120}
              className="input"
            />
          </Field>

          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything else a buyer should know — included paints, in-system location for hand-off, etc."
              maxLength={2000}
              rows={5}
              className="textarea"
            />
          </Field>

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

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Posting…" : (listingType === "wts" ? "Post for sale" : "Post buy request")}
            </button>
            <Link href="/community/auction" className="btn btn-ghost">
              Cancel
            </Link>
          </div>

          <div
            style={{
              marginTop: 4,
              padding: "10px 12px",
              borderRadius: 6,
              background: "rgba(77,217,255,0.06)",
              border: "1px solid rgba(77,217,255,0.18)",
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              lineHeight: 1.55,
            }}
          >
            🔔 <strong>Want a Discord ping when someone bites?</strong>{" "}
            Set up a one-time webhook on your{" "}
            <Link href="/account" style={{ color: "var(--accent)" }}>account page</Link>.
            We&apos;ll DM you in your channel the moment a buyer expresses
            interest or your listing is marked sold — handle and listing link
            included so you can jump straight into the trade.
          </div>
          <p style={{ marginTop: 4, color: "var(--text-dim)", fontSize: "0.78rem", lineHeight: 1.5 }}>
            Cancel or mark sold any time from your listing detail page.
          </p>
        </form>
      </div>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div className="label-mini" style={{ marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}
