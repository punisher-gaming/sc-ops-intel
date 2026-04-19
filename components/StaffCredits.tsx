"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { displayNameFor, roleLabelFor } from "@/lib/owner";

// "Please respect our Admin & Moderators" panel for the homepage. Pulls the
// staff list from public_staff_list() — a SECURITY DEFINER RPC that returns
// just the safe display fields (name, Discord handle, avatar) for users
// flagged as admin or moderator.
//
// Renders nothing if the RPC isn't available yet (migration not applied) or
// if there are no staff — the homepage shouldn't show an empty placeholder.

interface StaffMember {
  id: string;
  display_name: string | null;
  discord_username: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_moderator: boolean;
}

export function StaffCredits() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);

  useEffect(() => {
    const client = createClient();
    client
      .rpc("public_staff_list")
      .then(({ data, error }) => {
        if (error) {
          // Migration not applied yet, or RLS denied — render nothing
          setStaff([]);
          return;
        }
        // Server-side RPC already sorts is_admin desc, is_moderator desc,
        // so Owners (is_admin) come first and Admins (is_moderator) after.
        setStaff((data ?? []) as StaffMember[]);
      });
  }, []);

  if (!staff || staff.length === 0) return null;

  return (
    <section
      className="container-wide"
      style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}
    >
      <div
        className="card"
        style={{
          padding: "1.75rem",
          background:
            "linear-gradient(135deg, rgba(77,217,255,0.06), rgba(245,185,71,0.04))",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <div className="accent-label" style={{ marginBottom: 6 }}>
            ⚔ The crew running this site
          </div>
          <div
            style={{
              fontSize: "1.05rem",
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            Please respect our Admins &amp; Moderators
          </div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              marginTop: 4,
            }}
          >
            They keep the data clean, the music playing, and the community
            running. Thank them in Discord.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 14,
          }}
        >
          {staff.map((s) => (
            <StaffPill key={s.id} member={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StaffPill({ member }: { member: StaffMember }) {
  // Raw name → run through owner override so KNERFD shows uppercase.
  const rawName =
    member.display_name || member.discord_username || "Unnamed";
  const name = displayNameFor(member.id, rawName);
  // Role: Owner (is_admin) > Admin (is_moderator) > Staff
  const role =
    roleLabelFor(member.id, {
      is_admin: member.is_admin,
      is_moderator: member.is_moderator,
    }) ?? "Staff";
  // Owner = amber (top privilege, stands out), Admin = cyan accent
  const roleColor = role === "Owner" ? "var(--warn)" : "var(--accent)";

  return (
    <Link
      href={`/profile?id=${encodeURIComponent(member.id)}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px 8px 8px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        textDecoration: "none",
        color: "inherit",
      }}
      title={`View ${name}'s profile`}
    >
      {member.avatar_url ? (
        // Discord avatars come from cdn.discordapp.com or similar — bypass
        // next/image to avoid having to whitelist the host (we're a static
        // export anyway, so it's a plain <img>).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatar_url}
          alt={`${name} avatar`}
          width={32}
          height={32}
          style={{ borderRadius: "50%", display: "block" }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(88,101,242,0.25)", // Discord blurple, dim
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "rgba(88,101,242,1)",
          }}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{name}</span>
        <span
          style={{
            fontSize: "0.65rem",
            color: roleColor,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {role}
        </span>
      </div>
      <DiscordIcon />
    </Link>
  );
}

// Inline Discord wordmark glyph — no external asset, scales cleanly.
function DiscordIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="rgba(88,101,242,0.85)"
      aria-hidden
      style={{ marginLeft: 2 }}
    >
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.291a.077.077 0 0 1-.006.128 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
