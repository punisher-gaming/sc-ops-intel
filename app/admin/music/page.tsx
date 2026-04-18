"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { useUser } from "@/lib/supabase/hooks";
import { createClient } from "@/lib/supabase/client";
import {
  deleteTrack,
  fetchAllTracks,
  setTrackEnabled,
  setTrackOrder,
  uploadTrack,
  type MusicTrack,
} from "@/lib/music";

export default function MusicAdmin() {
  const { user, loading: userLoading } = useUser();
  const [isModerator, setIsModerator] = useState<boolean | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setIsModerator(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("is_moderator")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsModerator(Boolean((data as { is_moderator?: boolean } | null)?.is_moderator));
      });
  }, [user, userLoading]);

  async function reload() {
    try {
      const ts = await fetchAllTracks();
      setTracks(ts);
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    }
  }

  useEffect(() => {
    if (isModerator) reload();
  }, [isModerator]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !file || !title.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await uploadTrack(file, { title: title.trim(), artist: artist.trim() || undefined }, user.id);
      setTitle("");
      setArtist("");
      setFile(null);
      // Reset the file input
      const input = document.getElementById("music-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await reload();
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(t: MusicTrack) {
    await setTrackEnabled(t.id, !t.enabled);
    reload();
  }

  async function moveUp(t: MusicTrack, idx: number) {
    if (idx === 0) return;
    const above = tracks[idx - 1];
    await Promise.all([
      setTrackOrder(t.id, above.display_order),
      setTrackOrder(above.id, t.display_order),
    ]);
    reload();
  }
  async function moveDown(t: MusicTrack, idx: number) {
    if (idx === tracks.length - 1) return;
    const below = tracks[idx + 1];
    await Promise.all([
      setTrackOrder(t.id, below.display_order),
      setTrackOrder(below.id, t.display_order),
    ]);
    reload();
  }

  async function handleDelete(t: MusicTrack) {
    if (!confirm(`Delete "${t.title}"? This removes the audio file too.`)) return;
    await deleteTrack(t.id, t.storage_path);
    reload();
  }

  if (userLoading || isModerator === null) {
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
            <div style={{ marginBottom: 12 }}>Sign in to access the moderator tools.</div>
            <Link href="/login" className="btn btn-primary">Sign in</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!isModerator) {
    return (
      <PageShell>
        <div className="container" style={{ paddingTop: "4rem" }}>
          <div className="card" style={{ padding: "2rem" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>
              Moderator only
            </div>
            <div style={{ color: "var(--text-muted)" }}>
              This page manages site music uploads. Only users with the{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>is_moderator</code> flag on
              their profile can upload, reorder, or delete tracks.
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
          <h1>Music</h1>
          <p>
            Upload Star Citizen music to play on the site. MP3 / OGG / M4A.
            Tracks play in the order shown below. Disabled tracks stay in the
            list but don&apos;t play.
          </p>
        </div>

        {/* Upload form */}
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 12 }}>Upload a track</div>
          <form onSubmit={handleUpload} style={{ display: "grid", gap: 12, gridTemplateColumns: "2fr 2fr 1fr auto" }}>
            <label>
              <div className="label-mini" style={{ marginBottom: 6 }}>Title *</div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                className="input"
              />
            </label>
            <label>
              <div className="label-mini" style={{ marginBottom: 6 }}>Artist</div>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                maxLength={200}
                className="input"
              />
            </label>
            <label>
              <div className="label-mini" style={{ marginBottom: 6 }}>File *</div>
              <input
                id="music-file"
                type="file"
                accept="audio/*"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="input"
                style={{ padding: "8px 10px" }}
              />
            </label>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy || !file || !title.trim()}
                style={{ opacity: busy || !file || !title.trim() ? 0.5 : 1 }}
              >
                {busy ? "Uploading…" : "Upload"}
              </button>
            </div>
          </form>
          {err && (
            <div
              style={{
                marginTop: 12,
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
        </div>

        {/* Track list */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 12 }}>
            Tracks ({tracks.length})
          </div>
          {tracks.length === 0 ? (
            <div style={{ color: "var(--text-dim)", padding: "1rem 0" }}>
              No tracks uploaded yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tracks.map((t, i) => (
                <div
                  key={t.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center",
                    gap: 16,
                    padding: "12px 14px",
                    borderRadius: 6,
                    background: t.enabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    opacity: t.enabled ? 1 : 0.5,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{t.title}</div>
                    {t.artist && (
                      <div className="label-mini" style={{ marginTop: 2 }}>
                        {t.artist}
                      </div>
                    )}
                    <audio src={t.public_url} controls preload="none" style={{ width: "100%", marginTop: 8, height: 32 }} />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => moveUp(t, i)}
                      disabled={i === 0}
                      className="btn btn-ghost"
                      style={{ height: 28, padding: "0 10px", fontSize: "0.75rem" }}
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(t, i)}
                      disabled={i === tracks.length - 1}
                      className="btn btn-ghost"
                      style={{ height: 28, padding: "0 10px", fontSize: "0.75rem" }}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => toggleEnabled(t)}
                      className="btn btn-secondary"
                      style={{ height: 28, padding: "0 10px", fontSize: "0.75rem" }}
                    >
                      {t.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t)}
                      className="btn btn-ghost"
                      style={{ height: 28, padding: "0 10px", fontSize: "0.75rem", color: "var(--alert)" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
