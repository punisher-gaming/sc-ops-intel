"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPublishedTracks, type MusicTrack } from "@/lib/music";

// Floating music player, bottom-right.
// - Starts collapsed as a tiny "♪ Music" pill.
// - Clicking the pill expands the player with title + controls.
// - First play is user-initiated (browsers block autoplay of audio).
// - Preferences (volume, open/closed) persist in localStorage.

const LS_OPEN = "sc-ops-intel:music-open";
const LS_VOL = "sc-ops-intel:music-volume";
const LS_IDX = "sc-ops-intel:music-index";

export function MusicPlayer() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initial load of tracks + persisted prefs
  useEffect(() => {
    fetchPublishedTracks()
      .then((ts) => {
        setTracks(ts);
        if (typeof window !== "undefined") {
          const savedIdx = Number(localStorage.getItem(LS_IDX));
          if (Number.isFinite(savedIdx) && savedIdx >= 0 && savedIdx < ts.length) {
            setIdx(savedIdx);
          }
          const savedVol = Number(localStorage.getItem(LS_VOL));
          if (Number.isFinite(savedVol) && savedVol >= 0 && savedVol <= 1) {
            setVolume(savedVol);
          }
          setOpen(localStorage.getItem(LS_OPEN) === "1");
        }
      })
      .catch(() => {
        /* fail silently — player just doesn't show */
      });
  }, []);

  // Sync audio element when track/volume changes
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
  }, [volume]);

  // Keep localStorage in sync
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_VOL, String(volume));
      localStorage.setItem(LS_IDX, String(idx));
      localStorage.setItem(LS_OPEN, open ? "1" : "0");
    }
  }, [volume, idx, open]);

  // Don't render anything until we know there are tracks
  if (tracks.length === 0) return null;

  const track = tracks[idx];

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play().catch(() => {
        // Browser may still block — swallow silently
      });
    }
  }

  function next() {
    setIdx((i) => (i + 1) % tracks.length);
    // Restart playback automatically if we were playing
    setTimeout(() => {
      if (playing) audioRef.current?.play().catch(() => {});
    }, 50);
  }
  function prev() {
    setIdx((i) => (i - 1 + tracks.length) % tracks.length);
    setTimeout(() => {
      if (playing) audioRef.current?.play().catch(() => {});
    }, 50);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open music player"
        style={{
          position: "fixed",
          left: 16,
          top: 80,
          zIndex: 30,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 16px",
          borderRadius: 22,
          background: "rgba(10,14,22,0.85)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "var(--text-muted)",
          fontSize: "0.9rem",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
        }}
      >
        <span style={{ color: "var(--accent)", fontSize: "1.1rem" }}>♪</span> Music
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        top: 80,
        zIndex: 30,
        width: 360,
        padding: "12px 14px",
        borderRadius: 10,
        background: "rgba(10,14,22,0.92)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "var(--text)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
      }}
    >
      <audio
        ref={audioRef}
        src={track.public_url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          // Auto-advance
          const n = (idx + 1) % tracks.length;
          setIdx(n);
          setTimeout(() => audioRef.current?.play().catch(() => {}), 50);
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="label-mini">Now {playing ? "playing" : "paused"}</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {track.title}
          </div>
          {track.artist && (
            <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ color: "var(--text-dim)" }}>Artist:</span> {track.artist}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close music player"
          className="btn btn-ghost"
          style={{ height: 24, width: 24, padding: 0, fontSize: "0.9rem", minWidth: 0 }}
        >
          ×
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
        <button type="button" onClick={prev} className="btn btn-secondary" style={{ height: 32, padding: "0 10px" }} aria-label="Previous">
          ◁◁
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className="btn btn-primary"
          style={{ height: 32, flex: 1, fontSize: "0.85rem" }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={next} className="btn btn-secondary" style={{ height: 32, padding: "0 10px" }} aria-label="Next">
          ▷▷
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <span className="label-mini">Vol</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          style={{ flex: 1, accentColor: "var(--accent)" }}
          aria-label="Volume"
        />
        <span className="label-mini" style={{ width: 28, textAlign: "right", fontFamily: "var(--font-mono)" }}>
          {Math.round(volume * 100)}
        </span>
      </div>

      <div className="label-mini" style={{ marginTop: 10, textAlign: "center" }}>
        Track {idx + 1} / {tracks.length}
      </div>
    </div>
  );
}
