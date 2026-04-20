"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  KIND_LABELS,
  fetchMyIntelForEntity,
  fetchPublishedIntel,
  formatRelative,
  submitIntel,
  type EntityType,
  type IntelKind,
  type IntelReport,
} from "@/lib/intel";
import { useUser } from "@/lib/supabase/hooks";
import { CURRENT_PATCH } from "./PatchPill";

/**
 * Shows published community intel for an entity, plus a "Log intel" form
 * for signed-in users. Drops into any detail page.
 */
export function IntelPanel({
  entityType,
  entityId,
  entityName,
}: {
  entityType: EntityType;
  entityId: string;
  entityName: string;
}) {
  const { user } = useUser();
  const [published, setPublished] = useState<IntelReport[]>([]);
  const [mine, setMine] = useState<IntelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const reload = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [pub, myReports] = await Promise.all([
        fetchPublishedIntel(entityType, entityId),
        user ? fetchMyIntelForEntity(user.id, entityType, entityId) : Promise.resolve([]),
      ]);
      setPublished(pub);
      setMine(myReports.filter((r) => r.status !== "published"));
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId, user?.id]);

  return (
    <div className="card" style={{ padding: "1.5rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>Community intel</div>
          <div className="label-mini" style={{ marginTop: 4 }}>
            Field reports from Punisher Gaming members
          </div>
        </div>
        {user ? (
          <button
            className={showForm ? "btn btn-secondary" : "btn btn-primary"}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Cancel" : "Log intel"}
          </button>
        ) : (
          <Link href="/login" className="btn btn-secondary">
            Sign in to log intel
          </Link>
        )}
      </div>

      {showForm && user && (
        <IntelForm
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          userId={user.id}
          onDone={() => {
            setShowForm(false);
            reload();
          }}
        />
      )}

      {mine.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div className="label-mini" style={{ marginBottom: 6 }}>Your pending submissions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {mine.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "rgba(245,185,71,0.06)",
                  border: "1px solid rgba(245,185,71,0.25)",
                  fontSize: "0.85rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontWeight: 500 }}>{r.title}</span>
                  <span className="badge badge-warn" style={{ fontSize: "0.7rem" }}>{r.status}</span>
                </div>
                {r.body && <div style={{ color: "var(--text-muted)", marginTop: 4 }}>{r.body}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {err && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 6,
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.3)",
            color: "var(--alert)",
            fontSize: "0.85rem",
            marginBottom: 12,
          }}
        >
          {err}
        </div>
      )}

      {loading && published.length === 0 && (
        <div style={{ color: "var(--text-dim)", padding: "1rem 0" }}>Loading…</div>
      )}

      {!loading && published.length === 0 && (
        <div style={{ color: "var(--text-dim)", padding: "0.5rem 0" }}>
          No community intel yet. Be the first to report.
        </div>
      )}

      {published.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {published.map((r) => (
            <article
              key={r.id}
              style={{
                padding: "12px 14px",
                borderRadius: 6,
                background: "rgba(77,217,255,0.04)",
                border: "1px solid rgba(77,217,255,0.15)",
              }}
            >
              <header
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="badge badge-accent" style={{ fontSize: "0.7rem" }}>
                    {KIND_LABELS[r.kind]}
                  </span>
                  <span style={{ fontWeight: 500 }}>{r.title}</span>
                </div>
                <span className="label-mini">
                  {formatRelative(r.published_at ?? r.created_at)}
                  {r.game_version && ` · patch ${r.game_version}`}
                </span>
              </header>
              {r.location_hint && (
                <div style={{ color: "var(--text)", fontSize: "0.85rem", marginBottom: 4 }}>
                  📍 {r.location_hint}
                </div>
              )}
              {r.body && (
                <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {r.body}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function IntelForm({
  entityType,
  entityId,
  entityName,
  userId,
  onDone,
}: {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  userId: string;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<IntelKind>(
    entityType === "resource" ? "location" : "mission_reward",
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await submitIntel({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        kind,
        title: title.trim(),
        body: body.trim() || undefined,
        location_hint: locationHint.trim() || undefined,
        game_version: CURRENT_PATCH,
      });
      onDone();
    } catch (e) {
      setErr((e as Error).message ?? String(e));
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "1rem",
        marginBottom: 16,
        borderRadius: 6,
        background: "rgba(77,217,255,0.04)",
        border: "1px solid rgba(77,217,255,0.2)",
      }}
    >
      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
        Reporting on: <span style={{ color: "var(--text)", fontWeight: 500 }}>{entityName}</span>
      </div>

      <label>
        <div className="label-mini" style={{ marginBottom: 6 }}>Kind</div>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as IntelKind)}
          className="select"
        >
          {(Object.keys(KIND_LABELS) as IntelKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <label>
        <div className="label-mini" style={{ marginBottom: 6 }}>Title <span style={{ color: "var(--alert)" }}>*</span></div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder={
            kind === "mission_reward"
              ? "e.g. Dropped from Bounty Hunter Phase 3"
              : kind === "location"
                ? "e.g. Spawns near Daymar R&R"
                : kind === "shop_stock"
                  ? "e.g. Stocked at Platinum Bay, Everus Harbor"
                  : "Short summary"
          }
          className="input"
        />
      </label>

      <label>
        <div className="label-mini" style={{ marginBottom: 6 }}>Location hint</div>
        <input
          type="text"
          value={locationHint}
          onChange={(e) => setLocationHint(e.target.value)}
          maxLength={200}
          placeholder="e.g. Stanton · Microtech · NB Industries"
          className="input"
        />
      </label>

      <label>
        <div className="label-mini" style={{ marginBottom: 6 }}>Details</div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Anything useful, drop rate, time of day, which NPC, tips for farming, etc."
          className="textarea"
        />
      </label>

      {err && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 6,
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.3)",
            color: "var(--alert)",
            fontSize: "0.85rem",
          }}
        >
          {err}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !title.trim()}
          style={{ opacity: busy || !title.trim() ? 0.5 : 1 }}
        >
          {busy ? "Submitting…" : "Submit for review"}
        </button>
        <div style={{ color: "var(--text-dim)", fontSize: "0.8rem", alignSelf: "center" }}>
          Submissions are reviewed by moderators before going public.
        </div>
      </div>
    </form>
  );
}
