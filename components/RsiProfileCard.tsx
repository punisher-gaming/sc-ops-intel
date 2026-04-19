"use client";

import { useEffect, useState } from "react";

// Renders the RSI public-citizen card for a given handle. Calls our Worker
// proxy at /rsi/<handle> which scrapes RSI's HTML and returns clean JSON
// (1-hour edge cache). Renders nothing if the handle is missing or RSI
// returns 404.

const WORKER_BASE = "https://sc-ops-intel-ingest.clint-150.workers.dev";

interface RsiProfile {
  handle: string;
  display_handle: string | null;
  moniker: string | null;
  citizen_record: string | null;
  enlisted: string | null;
  location: string | null;
  language: string | null;
  avatar_url: string | null;
  bio: string | null;
  main_org: {
    sid: string | null;
    name: string | null;
    logo_url: string | null;
    rank: string | null;
  } | null;
  affiliated_org_count: number;
}

export function RsiProfileCard({ handle }: { handle: string }) {
  const [data, setData] = useState<RsiProfile | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) {
      setData(null);
      return;
    }
    setData(undefined);
    setErr(null);

    // RSI's public site has flaky moments (502/504 a few times a day).
    // Auto-retry once after 2s before showing a hard error.
    let cancelled = false;
    async function loadWithRetry() {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(`${WORKER_BASE}/rsi/${encodeURIComponent(handle)}`);
          if (cancelled) return;
          if (res.status === 404) {
            setData(null);
            return;
          }
          if (res.ok) {
            const body = (await res.json()) as RsiProfile;
            if (!cancelled) setData(body);
            return;
          }
          // Transient gateway errors → wait + retry. Other 4xx/5xx fall through.
          if ([502, 503, 504].includes(res.status) && attempt === 0) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          throw new Error(`RSI is having a hiccup (HTTP ${res.status}). Try refreshing in a moment.`);
        } catch (e) {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          if (!cancelled) setErr((e as Error).message ?? String(e));
        }
      }
    }
    loadWithRetry();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (data === undefined && !err) {
    return (
      <div className="card" style={{ padding: "1.25rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
        Loading RSI profile for <strong>{handle}</strong>…
      </div>
    );
  }

  if (err) {
    return (
      <div
        className="card"
        style={{
          padding: "1.25rem",
          color: "var(--text-muted)",
          fontSize: "0.85rem",
          borderLeft: "3px solid var(--warn)",
          background: "rgba(245,185,71,0.04)",
        }}
      >
        ⚠ <strong>RSI&apos;s site is having a moment</strong> — couldn&apos;t pull
        the citizen profile for <strong>{handle}</strong> right now. This
        almost always clears within a minute. Refresh the page or come back
        in a bit.
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="card" style={{ padding: "1.25rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
        No RSI profile found for handle <strong>{handle}</strong>. Either it
        doesn&apos;t exist, or it&apos;s set to private.
      </div>
    );
  }

  // TS narrowing: at this point data is RsiProfile (loading + error + null
  // were all early-returned above). Belt-and-suspenders bail just in case.
  if (!data) return null;

  const profileUrl = `https://robertsspaceindustries.com/citizens/${encodeURIComponent(data.handle)}`;

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div className="accent-label" style={{ marginBottom: 12 }}>
        ⛧ RSI citizen profile
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* Citizen avatar */}
        <div style={{ flexShrink: 0 }}>
          {data.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.avatar_url}
              alt={`${data.display_handle ?? data.handle} RSI avatar`}
              width={88}
              height={88}
              style={{
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.15)",
                objectFit: "cover",
                background: "rgba(0,0,0,0.3)",
              }}
            />
          ) : (
            <div
              aria-hidden
              style={{
                width: 88,
                height: 88,
                borderRadius: 6,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-dim)",
                fontSize: "1.5rem",
                fontWeight: 600,
              }}
            >
              {(data.display_handle ?? data.handle).charAt(0)}
            </div>
          )}
        </div>

        {/* Identity + facts */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
            {data.moniker ? data.moniker : data.display_handle}
            {data.moniker && data.display_handle && (
              <span style={{ color: "var(--text-dim)", fontWeight: 400, marginLeft: 6, fontSize: "0.85rem" }}>
                @{data.display_handle}
              </span>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "4px 14px",
              marginTop: 10,
              fontSize: "0.85rem",
            }}
          >
            {data.citizen_record && (
              <>
                <span className="label-mini">UEE record</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{data.citizen_record}</span>
              </>
            )}
            {data.enlisted && (
              <>
                <span className="label-mini">Enlisted</span>
                <span>{data.enlisted}</span>
              </>
            )}
            {data.location && (
              <>
                <span className="label-mini">Location</span>
                <span>{data.location}</span>
              </>
            )}
            {data.language && (
              <>
                <span className="label-mini">Fluency</span>
                <span>{data.language}</span>
              </>
            )}
          </div>

          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="label-mini"
            style={{ color: "var(--accent)", display: "inline-block", marginTop: 12 }}
          >
            Open on RSI ↗
          </a>
        </div>

        {/* Main org block — only when in an org */}
        {data.main_org && data.main_org.sid && (
          <a
            href={`https://robertsspaceindustries.com/orgs/${data.main_org.sid}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "10px 14px",
              borderRadius: 6,
              background: "rgba(77,217,255,0.05)",
              border: "1px solid rgba(77,217,255,0.18)",
              minWidth: 200,
              flex: "0 1 auto",
              textDecoration: "none",
              color: "inherit",
            }}
            title={`View ${data.main_org.name ?? data.main_org.sid} on RSI`}
          >
            {data.main_org.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.main_org.logo_url}
                alt=""
                width={48}
                height={48}
                style={{
                  borderRadius: 4,
                  background: "rgba(0,0,0,0.3)",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <div className="label-mini">Main org</div>
              <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--accent)", overflow: "hidden", textOverflow: "ellipsis" }}>
                {data.main_org.name ?? data.main_org.sid}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                {data.main_org.sid}
                {data.main_org.rank && ` · ${data.main_org.rank}`}
              </div>
            </div>
          </a>
        )}
      </div>

      {data.affiliated_org_count > 0 && (
        <div className="label-mini" style={{ marginTop: 12 }}>
          + {data.affiliated_org_count} affiliated org
          {data.affiliated_org_count === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}
