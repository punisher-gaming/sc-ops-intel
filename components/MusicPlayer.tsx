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
const LS_SHUFFLE = "sc-ops-intel:music-shuffle";
const LS_LOOP = "sc-ops-intel:music-loop";

type LoopMode = "off" | "all" | "one";

export function MusicPlayer() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [shuffle, setShuffle] = useState(false);
  // off → stop at end of playlist; all → wrap around (default);
  // one → repeat current track
  const [loop, setLoop] = useState<LoopMode>("all");
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
          setShuffle(localStorage.getItem(LS_SHUFFLE) === "1");
          const savedLoop = localStorage.getItem(LS_LOOP);
          if (savedLoop === "off" || savedLoop === "all" || savedLoop === "one") {
            setLoop(savedLoop);
          }
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
      localStorage.setItem(LS_SHUFFLE, shuffle ? "1" : "0");
      localStorage.setItem(LS_LOOP, loop);
    }
  }, [volume, idx, open, shuffle, loop]);

  // Pick the next index given the current state (shuffle / loop / playlist length)
  function pickNext(current: number, len: number): number | null {
    if (len <= 1) return loop === "off" ? null : current;
    if (shuffle) {
      // Random other index — never repeat current immediately
      let r = Math.floor(Math.random() * (len - 1));
      if (r >= current) r += 1;
      return r;
    }
    const next = current + 1;
    if (next < len) return next;
    return loop === "off" ? null : 0;
  }

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
    const n = pickNext(idx, tracks.length);
    if (n == null) {
      // Loop=off, hit end of playlist — stop playback
      audioRef.current?.pause();
      return;
    }
    setIdx(n);
    setTimeout(() => {
      if (playing) audioRef.current?.play().catch(() => {});
    }, 50);
  }
  function prev() {
    // Prev always steps backward through the linear order, regardless of
    // shuffle. Wraps if loop != "off".
    setIdx((i) => {
      if (i > 0) return i - 1;
      return loop === "off" ? 0 : tracks.length - 1;
    });
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
        className="music-fab music-fab-holo"
      >
        <span className="music-fab-spin">
          <span style={{ color: "var(--accent)", fontSize: "1.1rem" }}>♪</span>
          <span className="music-fab-label"> Music</span>
        </span>
      </button>
    );
  }

  return (
    <div className="music-panel music-panel-holo">
      <audio
        ref={audioRef}
        src={track.public_url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          // Loop=one → replay current track
          if (loop === "one") {
            const el = audioRef.current;
            if (el) {
              el.currentTime = 0;
              el.play().catch(() => {});
            }
            return;
          }
          const n = pickNext(idx, tracks.length);
          if (n == null) return; // loop=off, end of playlist
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

      {/* Shuffle + Loop row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <button
          type="button"
          onClick={() => setShuffle((v) => !v)}
          aria-pressed={shuffle}
          aria-label={`Shuffle ${shuffle ? "on" : "off"}`}
          title={`Shuffle ${shuffle ? "on" : "off"}`}
          style={{
            flex: 1,
            height: 28,
            padding: "0 10px",
            borderRadius: 6,
            background: shuffle ? "rgba(77,217,255,0.15)" : "rgba(255,255,255,0.04)",
            color: shuffle ? "var(--accent)" : "var(--text-muted)",
            border: `1px solid ${shuffle ? "rgba(77,217,255,0.45)" : "rgba(255,255,255,0.1)"}`,
            cursor: "pointer",
            fontSize: "0.78rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          ⇄ Shuffle
        </button>
        <button
          type="button"
          onClick={() => setLoop((m) => (m === "off" ? "all" : m === "all" ? "one" : "off"))}
          aria-label={`Loop ${loop}`}
          title={loop === "off" ? "Loop off — stop at end" : loop === "all" ? "Loop playlist" : "Loop one — repeat track"}
          style={{
            flex: 1,
            height: 28,
            padding: "0 10px",
            borderRadius: 6,
            background: loop !== "off" ? "rgba(77,217,255,0.15)" : "rgba(255,255,255,0.04)",
            color: loop !== "off" ? "var(--accent)" : "var(--text-muted)",
            border: `1px solid ${loop !== "off" ? "rgba(77,217,255,0.45)" : "rgba(255,255,255,0.1)"}`,
            cursor: "pointer",
            fontSize: "0.78rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {loop === "one" ? "↻¹ Loop one" : loop === "all" ? "↻ Loop all" : "↻ Loop off"}
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
