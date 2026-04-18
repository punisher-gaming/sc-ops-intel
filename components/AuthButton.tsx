"use client";

import Link from "next/link";
import { useUser } from "@/lib/supabase/hooks";

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

  return (
    <Link href="/account" className="btn btn-secondary">
      Account
    </Link>
  );
}
