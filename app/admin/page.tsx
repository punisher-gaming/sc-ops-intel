"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { useUser } from "@/lib/supabase/hooks";
import { createClient } from "@/lib/supabase/client";

interface Role {
  is_admin: boolean;
  is_moderator: boolean;
}

export default function AdminHome() {
  const { user, loading: userLoading } = useUser();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setRole({ is_admin: false, is_moderator: false });
      return;
    }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("is_admin, is_moderator")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const p = (data ?? {}) as Partial<Role>;
        setRole({
          is_admin: Boolean(p.is_admin),
          is_moderator: Boolean(p.is_moderator),
        });
      });
  }, [user, userLoading]);

  if (userLoading || role === null) {
    return (
      <PageShell>
        <div className="container" style={{ paddingTop: "4rem", color: "var(--text-muted)" }}>
          Loading…
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="container" style={{ paddingTop: "4rem" }}>
          <div className="card" style={{ padding: "2rem" }}>
            <div style={{ marginBottom: 12 }}>Sign in to access admin tools.</div>
            <Link href="/login" className="btn btn-primary">Sign in</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!role.is_moderator && !role.is_admin) {
    return (
      <PageShell>
        <div className="container" style={{ paddingTop: "4rem" }}>
          <div className="card" style={{ padding: "2rem" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>
              Moderator tools
            </div>
            <div style={{ color: "var(--text-muted)" }}>
              You&apos;re signed in but aren&apos;t a moderator or admin. Ask
              knerfd to flip your{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>is_moderator</code>{" "}
              flag if you need access.
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container" style={{ paddingTop: "2.5rem" }}>
        <div className="page-header">
          <div className="accent-label">Admin</div>
          <h1>Control panel</h1>
          <p>
            Signed in as{" "}
            {role.is_admin && <span className="badge badge-accent" style={{ marginRight: 6 }}>admin</span>}
            {role.is_moderator && <span className="badge badge-success">moderator</span>}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {role.is_admin && (
            <AdminCard
              href="/admin/users"
              title="Users"
              body="See every registered user, toggle moderator / admin flags."
            />
          )}
          <AdminCard
            href="/admin/music"
            title="Music"
            body="Upload, reorder, disable, or delete site music tracks."
          />
          <AdminCard
            href="#"
            title="Intel submissions"
            body="Approve / reject community intel reports. UI coming next — for now flip status in the intel_reports Supabase table."
            disabled
          />
          <AdminCard
            href="#"
            title="Price submissions"
            body="Approve / reject community commodity prices. UI coming next — for now flip status in commodity_prices."
            disabled
          />
        </div>
      </div>
    </PageShell>
  );
}

function AdminCard({
  href,
  title,
  body,
  disabled,
}: {
  href: string;
  title: string;
  body: string;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontSize: "1.05rem", fontWeight: 600 }}>{title}</div>
        {disabled && <span className="badge badge-muted">Soon</span>}
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>{body}</div>
      {!disabled && (
        <div style={{ marginTop: 14, color: "var(--accent)", fontSize: "0.85rem", fontWeight: 500 }}>
          Open →
        </div>
      )}
    </>
  );
  if (disabled) {
    return (
      <div className="card" style={{ padding: "1.25rem 1.5rem", opacity: 0.6 }}>
        {inner}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="card card-hover"
      style={{ padding: "1.25rem 1.5rem", display: "block", textDecoration: "none", color: "var(--text)" }}
    >
      {inner}
    </Link>
  );
}
