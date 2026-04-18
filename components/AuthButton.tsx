"use client";

import Link from "next/link";
import { useUser } from "@/lib/supabase/hooks";

export function AuthButton() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <span className="font-mono text-bone/30" style={{ fontSize: "1.1rem", letterSpacing: "0.18em" }}>
        ...
      </span>
    );
  }

  if (!user) {
    return (
      <Link href="/login" className="cta">
        Login
      </Link>
    );
  }

  return (
    <Link href="/account" className="cta">
      Account
    </Link>
  );
}
