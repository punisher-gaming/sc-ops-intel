"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  deleteFleet,
  fetchMyFleets,
  renameFleet,
  setFleetPublic,
  type Fleet,
} from "@/lib/fleets";

export function SavedFleets({ userId }: { userId: string }) {
  const [fleets, setFleets] = useState<Fleet[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function reload() {
    try {
      const f = await fetchMyFleets(userId);
      setFleets(f);
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete fleet "${name}"?`)) return;
    await deleteFleet(id);
    reload();
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    await renameFleet(id, editName.trim());
    setEditingId(null);
    setEditName("");
    reload();
  }

  // Optimistic flip — update local state immediately so the toggle feels
  // snappy, then persist. Revert on failure.
  async function handleTogglePublic(f: Fleet) {
    const next = !f.is_public;
    setFleets((curr) =>
      curr ? curr.map((x) => (x.id === f.id ? { ...x, is_public: next } : x)) : curr,
    );
    try {
      await setFleetPublic(f.id, next);
    } catch (e) {
      // Rollback
      setFleets((curr) =>
        curr ? curr.map((x) => (x.id === f.id ? { ...x, is_public: !next } : x)) : curr,
      );
      setErr((e as Error).message ?? String(e));
    }
  }

  return (
    <div className="card" style={{ padding: "1.75rem", marginTop: "1rem" }}>
      <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12 }}>Saved fleets</div>

      {err && (
        <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", color: "var(--alert)", fontSize: "0.85rem", marginBottom: 12 }}>
          {err}
        </div>
      )}

      {fleets === null && !err && <div style={{ color: "var(--text-muted)" }}>Loading…</div>}

      {fleets && fleets.length === 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
          You haven&apos;t saved any fleets yet. On the{" "}
          <Link href="/ships" style={{ color: "var(--accent)" }}>Ships</Link> page, tick the
          ✓ column on a few ships, click <strong>Compare fleet</strong>, then hit{" "}
          <strong>Save fleet</strong>.
        </div>
      )}

      {fleets && fleets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {fleets.map((f) => (
            <div
              key={f.id}
              style={{
                padding: "12px 14px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                {editingId === f.id ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={100}
                      className="input"
                      style={{ height: 30, fontSize: "0.9rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(f.id)}
                      className="btn btn-primary"
                      style={{ height: 30, padding: "0 10px", fontSize: "0.8rem" }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setEditName(""); }}
                      className="btn btn-ghost"
                      style={{ height: 30, padding: "0 10px", fontSize: "0.8rem" }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      href={`/ships/compare?ids=${f.ship_ids.map(encodeURIComponent).join(",")}`}
                      style={{ color: "var(--accent)", fontWeight: 500, fontSize: "0.95rem" }}
                    >
                      {f.name}
                    </Link>
                    <div className="label-mini" style={{ marginTop: 4 }}>
                      {f.ship_ids.length} ship{f.ship_ids.length === 1 ? "" : "s"} · saved {new Date(f.created_at).toLocaleDateString()}
                      {" · "}
                      <span
                        style={{
                          color: f.is_public ? "var(--success)" : "var(--text-dim)",
                          fontWeight: 500,
                        }}
                      >
                        {f.is_public ? "🌐 Public" : "🔒 Private"}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {editingId !== f.id && (
                <div style={{ display: "flex", gap: 4 }}>
                  <Link
                    href={`/ships/compare?ids=${f.ship_ids.map(encodeURIComponent).join(",")}`}
                    className="btn btn-secondary"
                    style={{ height: 28, padding: "0 10px", fontSize: "0.75rem" }}
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleTogglePublic(f)}
                    className="btn btn-ghost"
                    title={f.is_public ? "Hide from your public profile" : "Show on your public profile"}
                    style={{
                      height: 28,
                      padding: "0 10px",
                      fontSize: "0.75rem",
                      color: f.is_public ? "var(--success)" : "var(--text-muted)",
                    }}
                  >
                    {f.is_public ? "Make private" : "Make public"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingId(f.id); setEditName(f.name); }}
                    className="btn btn-ghost"
                    style={{ height: 28, padding: "0 10px", fontSize: "0.75rem" }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(f.id, f.name)}
                    className="btn btn-ghost"
                    style={{ height: 28, padding: "0 10px", fontSize: "0.75rem", color: "var(--alert)" }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
