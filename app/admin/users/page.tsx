"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { useUser } from "@/lib/supabase/hooks";
import {
  checkIsAdmin,
  fetchAdminUsers,
  setUserRole,
  type AdminUserRow,
} from "@/lib/admin";

export default function AdminUsers() {
  const { user, loading: userLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    checkIsAdmin(user.id).then(setIsAdmin);
  }, [user, userLoading]);

  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchAdminUsers();
      setRows(data);
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) reload();
  }, [isAdmin]);

  async function toggle(row: AdminUserRow, role: "is_moderator" | "is_admin") {
    if (busyId) return;
    setBusyId(row.id);
    try {
      await setUserRole(row.id, role, !row[role]);
      // Optimistic update so toggle feels instant
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [role]: !r[role] } : r)));
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    if (!qLower) return rows;
    return rows.filter((r) => {
      const hay = [
        r.email,
        r.display_name,
        r.discord_username,
        r.rsi_handle,
        r.provider,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(qLower);
    });
  }, [rows, q]);

  if (userLoading || isAdmin === null) {
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

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="container" style={{ paddingTop: "4rem" }}>
          <div className="card" style={{ padding: "2rem" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>
              Admin only
            </div>
            <div style={{ color: "var(--text-muted)" }}>
              This page manages user roles. Only the site admin
              (<code style={{ fontFamily: "var(--font-mono)" }}>profiles.is_admin = true</code>)
              can access it.
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container-wide" style={{ paddingTop: "2.5rem" }}>
        <div className="page-header">
          <div className="accent-label">Admin</div>
          <h1>Users</h1>
          <p>
            Toggle moderator access per user. Moderators can upload music,
            publish community intel, and approve commodity prices. Admin
            (that&apos;s you) is the only role that can manage other users.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, Discord username…"
            className="input"
            style={{ flex: 1, minWidth: 260 }}
          />
          <div className="label-mini">
            {rows ? `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} users` : "…"}
          </div>
          <button
            type="button"
            onClick={reload}
            className="btn btn-ghost"
            style={{ height: 40, padding: "0 14px" }}
          >
            Refresh
          </button>
        </div>

        {err && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 6,
              background: "rgba(255,107,107,0.08)",
              border: "1px solid rgba(255,107,107,0.3)",
              color: "var(--alert)",
              marginBottom: 16,
            }}
          >
            {err}
          </div>
        )}

        {loading && rows.length === 0 && (
          <div style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Loading users…</div>
        )}

        {rows.length > 0 && (
          <div className="table-shell" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={thStyle("left")}>User</th>
                  <th style={thStyle("left", 130)}>Provider</th>
                  <th style={thStyle("left", 140)}>Joined</th>
                  <th style={thStyle("center", 110)}>Moderator</th>
                  <th style={thStyle("center", 90)}>Admin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const label =
                    r.discord_username || r.display_name || r.email || r.id;
                  const isSelf = r.id === user.id;
                  return (
                    <tr key={r.id}>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {r.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.avatar_url}
                              alt=""
                              width={32}
                              height={32}
                              style={{
                                borderRadius: "50%",
                                border: "1px solid rgba(255,255,255,0.15)",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div
                              aria-hidden
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: "rgba(77,217,255,0.08)",
                                border: "1px solid rgba(77,217,255,0.25)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--accent)",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                              }}
                            >
                              {label.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 500 }}>
                              {label}
                              {isSelf && (
                                <span className="label-mini" style={{ marginLeft: 8 }}>
                                  (you)
                                </span>
                              )}
                            </div>
                            <div style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginTop: 2 }}>
                              {r.email ?? "—"}
                              {r.rsi_handle && ` · RSI: ${r.rsi_handle}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: "var(--text-muted)", textTransform: "capitalize" }}>
                        {r.provider ?? "—"}
                      </td>
                      <td style={{ ...tdStyle, color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                        {r.created_at
                          ? new Date(r.created_at).toISOString().slice(0, 10)
                          : "—"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <Toggle
                          checked={r.is_moderator}
                          onChange={() => toggle(r, "is_moderator")}
                          busy={busyId === r.id}
                          label="Toggle moderator"
                        />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <Toggle
                          checked={r.is_admin}
                          onChange={() => toggle(r, "is_admin")}
                          busy={busyId === r.id}
                          disabled={isSelf && r.is_admin /* can't un-admin yourself via UI */}
                          label="Toggle admin"
                        />
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "2.5rem 0", textAlign: "center", color: "var(--text-dim)" }}>
                      No users match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginTop: 16, lineHeight: 1.5 }}>
          Moderator: can upload music, publish intel reports, approve community prices.
          Admin: can manage other users. The admin flag can&apos;t be removed from yourself via this UI (use SQL if you really need to hand the role off).
        </p>
      </div>
    </PageShell>
  );
}

function Toggle({
  checked,
  onChange,
  busy,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  busy: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={busy || disabled}
      aria-label={label}
      aria-pressed={checked}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? "rgba(77,217,255,0.8)" : "rgba(255,255,255,0.1)",
        border: `1px solid ${checked ? "rgba(77,217,255,1)" : "rgba(255,255,255,0.2)"}`,
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: busy || disabled ? 0.5 : 1,
        transition: "background-color 0.15s, border-color 0.15s",
        padding: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: checked ? "var(--ink)" : "rgba(255,255,255,0.7)",
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}

function thStyle(align: "left" | "center" | "right", width?: number): React.CSSProperties {
  return {
    padding: "12px 16px",
    textAlign: align,
    color: "var(--text-dim)",
    fontSize: "0.7rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    width,
    fontWeight: 500,
    whiteSpace: "nowrap",
  };
}

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  fontSize: "0.875rem",
};
