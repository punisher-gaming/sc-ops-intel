"use client";

import Link from "next/link";
import { useUser } from "@/lib/supabase/hooks";

function displayLabel(user: ReturnType<typeof useUser>["user"]): string {
  if (!user) return "";
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    (meta.user_name as string | undefined) ||
    (meta.preferred_username as string | undefined) ||
    user.email;
  if (!name) return "Account";
  // First token only, keeps the nav chip compact
  return String(name).split(/\s+/)[0];
}

function avatarUrl(user: ReturnType<typeof useUser>["user"]): string | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const url =
    (meta.avatar_url as string | undefined) ||
    (meta.picture as string | undefined);
  return url ?? null;
}

export function AuthButton() {
  const { user, loading } = useUser();

  if (loading) {
    return <span className="btn btn-ghost" style={{ opacity: 0.5 }}>…</span>;
  }

  if (!user) {
    return (
      <Link href="/login" className="btn btn-primary">
        Sign in
      </Link>
    );
  }

  const av = avatarUrl(user);
  const label = displayLabel(user);

  return (
    <Link
      href="/account"
      className="btn btn-secondary"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        paddingLeft: av ? 4 : undefined,
      }}
    >
      {av && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={av}
          alt=""
          width={26}
          height={26}
          style={{
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.15)",
            objectFit: "cover",
          }}
        />
      )}
      <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </Link>
  );
}
