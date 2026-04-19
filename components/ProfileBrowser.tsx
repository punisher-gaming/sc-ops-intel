"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchPublicProfile, type PublicProfile } from "@/lib/publicProfile";
import { fetchPublicFleets, type Fleet } from "@/lib/fleets";
import { fetchShipsByIds, type Ship } from "@/lib/ships";
import { RsiProfileCard } from "./RsiProfileCard";
import { Hologram } from "./Hologram";

// Public profile page — anyone can view. Reads ?id=<uuid> from the URL,
// loads the user's safe display fields plus all their is_public fleets,
// and renders a roster of ships per fleet.
//
// Only public fleets show up: the RLS policy on user_fleets enforces this
// at the DB level, so even if we forgot to filter we'd only see public
// rows. Belt-and-suspenders.

export function ProfileBrowser() {
  const params = useSearchParams();
  const uid = params.get("id") ?? "";
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined);
  const [fleets, setFleets] = useState<Fleet[] | null>(null);
  const [shipsById, setShipsById] = useState<Map<string, Ship>>(new Map());
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setFleets([]);
      return;
    }
    setProfile(undefined);
    setFleets(null);
    setErr(null);
    fetchPublicProfile(uid).then(setProfile).catch(() => setProfile(null));
    fetchPublicFleets(uid)
      .then(async (fs) => {
        setFleets(fs);
        // Resolve every ship_id across every fleet so we can render names
        const all = Array.from(new Set(fs.flatMap((f) => f.ship_ids)));
        if (all.length === 0) return;
        try {
          const ships = await fetchShipsByIds(all);
          const map = new Map<string, Ship>();
          for (const s of ships) map.set(s.id, s);
          setShipsById(map);
        } catch (e) {
          // non-fatal — fleet rows just won't have ship names
          console.warn("[profile] ship lookup failed", e);
        }
      })
      .catch((e) => setErr((e as Error).message ?? String(e)));
  }, [uid]);

  if (!uid) {
    return (
      <div className="container" style={{ paddingTop: "3rem" }}>
        <div className="card" style={{ padding: "1.5rem", color: "var(--text-muted)" }}>
          No profile selected. Profile links from the community use{" "}
          <code>/profile?id=&lt;user-id&gt;</code>.
        </div>
      </div>
    );
  }

  if (profile === undefined) {
    return (
      <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
        Loading profile…
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="container" style={{ paddingTop: "3rem" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ color: "var(--alert)", marginBottom: 12 }}>Profile not found</div>
          <Link href="/community" style={{ color: "var(--accent)" }}>← Back to community</Link>
        </div>
      </div>
    );
  }

  const name = profile.display_name || profile.discord_username || "Player";
  const role = profile.is_admin ? "Admin" : profile.is_moderator ? "Moderator" : null;

  return (
    <div className="container" style={{ paddingTop: "2rem" }}>
      {/* Header — avatar + name + handles */}
      <div
        className="card"
        style={{
          padding: "1.75rem",
          display: "flex",
          gap: 18,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Project the avatar as a Star Wars hologram — cyan-tinted, with
            scanlines + rolling band + flicker. Reads as the rebel briefing
            "we caught a holo of this player" vibe. */}
        <Hologram stage>
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={`${name} avatar`}
              width={72}
              height={72}
              style={{
                borderRadius: "50%",
                border: "1px solid rgba(125,249,255,0.35)",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div
              aria-hidden
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(125,249,255,0.12)",
                border: "1px solid rgba(125,249,255,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                fontWeight: 600,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </Hologram>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{name}</h1>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {profile.discord_username && (
              <span>Discord: <strong>@{profile.discord_username}</strong></span>
            )}
            {profile.rsi_handle && (
              <span>RSI: <strong>{profile.rsi_handle}</strong></span>
            )}
            {role && (
              <span
                style={{
                  color: profile.is_admin ? "var(--accent)" : "var(--warn)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                  fontSize: "0.7rem",
                }}
              >
                ⚔ {role}
              </span>
            )}
          </div>
          {profile.bio && (
            <p style={{ marginTop: 10, color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* RSI public profile (only when user has set their handle) */}
      {profile.rsi_handle && (
        <div style={{ marginTop: "1.25rem" }}>
          <RsiProfileCard handle={profile.rsi_handle} />
        </div>
      )}

      {/* Fleets */}
      <div style={{ marginTop: "1.25rem" }}>
        <div className="page-header" style={{ paddingBottom: "0.5rem" }}>
          <div className="accent-label">Public fleets</div>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
            {fleets === null ? "Loading…" : `${fleets.length} fleet${fleets.length === 1 ? "" : "s"}`}
          </h2>
        </div>

        {err && (
          <div style={{ padding: "10px 14px", borderRadius: 6, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", color: "var(--alert)", fontSize: "0.85rem" }}>
            {err}
          </div>
        )}

        {fleets && fleets.length === 0 && !err && (
          <div className="card" style={{ padding: "1.5rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {name} hasn&apos;t published any fleets yet. Fleets default to private —
            owners flip the toggle on their account page to share.
          </div>
        )}

        {fleets && fleets.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {fleets.map((f) => (
              <FleetCard key={f.id} fleet={f} shipsById={shipsById} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FleetCard({ fleet, shipsById }: { fleet: Fleet; shipsById: Map<string, Ship> }) {
  return (
    <div className="card" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
        <Link
          href={`/ships/compare?ids=${fleet.ship_ids.map(encodeURIComponent).join(",")}`}
          style={{ color: "var(--accent)", fontWeight: 600, fontSize: "1rem" }}
        >
          {fleet.name}
        </Link>
        <div className="label-mini">
          {fleet.ship_ids.length} ship{fleet.ship_ids.length === 1 ? "" : "s"} · saved {new Date(fleet.created_at).toLocaleDateString()}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {fleet.ship_ids.map((id) => {
          const s = shipsById.get(id);
          if (!s) {
            return (
              <span
                key={id}
                style={{
                  padding: "4px 10px",
                  borderRadius: 14,
                  fontSize: "0.78rem",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text-dim)",
                }}
              >
                Unknown ship
              </span>
            );
          }
          return (
            <Link
              key={id}
              href={`/ships?id=${encodeURIComponent(id)}`}
              style={{
                padding: "4px 10px",
                borderRadius: 14,
                fontSize: "0.78rem",
                background: "rgba(77,217,255,0.08)",
                color: "var(--accent)",
                border: "1px solid rgba(77,217,255,0.2)",
                textDecoration: "none",
              }}
              title={`${s.manufacturer ?? ""} ${s.name}`.trim()}
            >
              {s.name}
            </Link>
          );
        })}
      </div>
      {fleet.notes && (
        <p style={{ marginTop: 10, fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
          {fleet.notes}
        </p>
      )}
    </div>
  );
}
