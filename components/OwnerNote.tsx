// Owner's personal note on the homepage — a free-to-play Verse message
// plus the RSI enlist referral link. Sits just above the staff credits
// panel. Styled as a signed letter rather than a banner so it reads as
// personal rather than an ad.

import Link from "next/link";

const REFERRAL_URL =
  "https://www.robertsspaceindustries.com/enlist?referral=STAR-KRGK-GS43";
const REFERRAL_CODE = "STAR-KRGK-GS43";

export function OwnerNote() {
  return (
    <section
      className="container"
      style={{ paddingTop: "2.5rem", paddingBottom: "1rem" }}
    >
      <div
        className="card"
        style={{
          padding: "1.75rem 1.75rem 1.5rem",
          background:
            "linear-gradient(135deg, rgba(77,217,255,0.05), rgba(255,255,255,0.02))",
          border: "1px solid rgba(77,217,255,0.18)",
          position: "relative",
        }}
      >
        <div
          className="accent-label"
          style={{ marginBottom: 10, color: "var(--accent)" }}
        >
          ⛧ A message from the Owner
        </div>

        <p
          style={{
            fontSize: "1.05rem",
            lineHeight: 1.65,
            color: "var(--text)",
            margin: "0 0 14px",
          }}
        >
          CitizenDex is <strong>free to the Verse</strong> — no paywalls, no
          logins required, no ads. If you&apos;re new to Star Citizen and
          enjoying this site, consider using my referral link when you enlist.
          You get <strong>5,000 UEC</strong> in-game credits on sign-up and it
          helps keep the lights on here. No pressure either way — the
          database stays free regardless.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <a
            href={REFERRAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            🚀 Enlist with my referral
          </a>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              padding: "6px 12px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            title="Manual entry if the button doesn't work"
          >
            Referral code: <span style={{ color: "var(--accent)" }}>{REFERRAL_CODE}</span>
          </div>
        </div>

        {/* Signoff — personal, mixed case for "o7 to all" so it reads like
            hand-signed rather than a banner. */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            o7 to all,
          </div>
          <Link
            href="/profile?id=11a713da-315d-40cb-8fa7-b092787eea01"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "var(--accent)",
              textDecoration: "none",
              fontSize: "0.95rem",
            }}
            title="KNERFD's profile"
          >
            — KNERFD
            <span
              style={{
                color: "var(--text-dim)",
                fontWeight: 400,
                letterSpacing: "0.05em",
                marginLeft: 8,
                fontSize: "0.8rem",
              }}
            >
              Owner · CitizenDex
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
