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
const LS_MUTED = "sc-ops-intel:music-muted";

type LoopMode = "off" | "all" | "one";

export function MusicPlayer() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  // off → stop at end of playlist; all → wrap around (default);
  // one → repeat current track
  const [loop, setLoop] = useState<LoopMode>("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initial load of tracks + persisted prefs. No autoplay: the player
  // sits silent until the user clicks Play. (Earlier autoplay attempts
  // caused races between the deferred play() and user clicks, leading
  // to overlapping audio. Removed entirely. The CitizenDex theme is
  // simply position 1 in the playlist via DB display_order, so the
  // first thing users hit Play on is the brand song.)
  useEffect(() => {
    fetchPublishedTracks()
      .then((ts) => {
        setTracks(ts);
        if (typeof window === "undefined") return;
        const savedVol = Number(localStorage.getItem(LS_VOL));
        if (Number.isFinite(savedVol) && savedVol >= 0 && savedVol <= 1) {
          setVolume(savedVol);
        }
        setOpen(localStorage.getItem(LS_OPEN) === "1");
        setShuffle(localStorage.getItem(LS_SHUFFLE) === "1");
        setMuted(localStorage.getItem(LS_MUTED) === "1");
        const savedLoop = localStorage.getItem(LS_LOOP);
        if (savedLoop === "off" || savedLoop === "all" || savedLoop === "one") {
          setLoop(savedLoop);
        }
        // Restore the saved track index so returning visitors land on
        // wherever they left off. Falls back to 0 (first track in
        // display_order, which is now the CitizenDex theme).
        const savedIdx = Number(localStorage.getItem(LS_IDX));
        if (Number.isFinite(savedIdx) && savedIdx >= 0 && savedIdx < ts.length) {
          setIdx(savedIdx);
        }
      })
      .catch(() => {
        /* fail silently, player just doesn't show */
      });
  }, []);

  // Sync audio element when track/volume/muted changes
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    el.muted = muted;
  }, [volume, muted]);

  // Keep localStorage in sync
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_VOL, String(volume));
      localStorage.setItem(LS_IDX, String(idx));
      localStorage.setItem(LS_OPEN, open ? "1" : "0");
      localStorage.setItem(LS_SHUFFLE, shuffle ? "1" : "0");
      localStorage.setItem(LS_LOOP, loop);
      localStorage.setItem(LS_MUTED, muted ? "1" : "0");
    }
  }, [volume, idx, open, shuffle, loop, muted]);

  // Pick the next index given the current state (shuffle / loop / playlist length)
  function pickNext(current: number, len: number): number | null {
    if (len <= 1) return loop === "off" ? null : current;
    if (shuffle) {
      // Random other index, never repeat current immediately
      let r = Math.floor(Math.random() * (len - 1));
      if (r >= current) r += 1;
      return r;
    }
    const next = current + 1;
    if (next < len) return next;
    return loop === "off" ? null : 0;
  }

  // Tracks the user's intent across track changes. The <audio> element's
  // own `paused` state resets when src changes, so we can't rely on it
  // to know whether to autoplay the next track. Instead we mirror intent
  // here and use it from the src-change effect below.
  // ALL HOOKS must run on every render, including before the early
  // return below, or React's hook-order check will (correctly) yell.
  const wantPlayingRef = useRef(false);
  useEffect(() => {
    wantPlayingRef.current = playing;
  }, [playing]);

  // When the track index changes (prev/next/shuffle), pause the current
  // audio, swap src, then resume only if the user was already playing.
  // Doing this in an effect (instead of a setTimeout in the click
  // handler) eliminates the race where rapid clicking could leave two
  // play() calls in flight against different src values.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    // Hard reset, calling pause() before src changes prevents the old
    // track from briefly continuing while the new one loads.
    el.pause();
    el.currentTime = 0;
    if (wantPlayingRef.current) {
      // Wait for the browser to be ready to play the new src. Calling
      // play() immediately after a src change can fail with NotAllowed
      // / NotSupportedError in some browsers because the new media
      // resource hasn't loaded yet. Listening for 'canplay' lets the
      // resource pipeline catch up before we kick playback.
      const tryPlay = () => {
        if (!wantPlayingRef.current) return;
        el.play().catch(() => {});
      };
      if (el.readyState >= 3) {
        tryPlay();
      } else {
        const onCan = () => {
          el.removeEventListener("canplay", onCan);
          tryPlay();
        };
        el.addEventListener("canplay", onCan);
        // Force-load in case the browser hasn't started fetching yet.
        el.load();
      }
    }
    // We deliberately depend on idx only, the src change is implicit
    // via the audio element's `src` prop being driven by `track`.
  }, [idx]);

  function togglePlay() {
    
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      // If we're at end-of-track (e.g. the brand-song autoplay just
      // finished and stopped), rewind to 0 before playing so the user
      // gets the song from the start instead of an instant re-end.
      if (el.duration && el.currentTime >= el.duration - 0.05) {
        el.currentTime = 0;
      }
      el.play().catch(() => {
        // Browser may still block, swallow silently
      });
    }
  }

  function next() {
    
    // User clicked Next, that's an explicit "keep playing" signal.
    // Restore wantPlayingRef so the src-change useEffect plays the
    // new track (wantPlayingRef may have been cleared by the
    // brand-song-ended path).
    wantPlayingRef.current = true;
    const n = pickNext(idx, tracks.length);
    if (n == null) {
      // Loop=off, hit end of playlist, stop playback
      audioRef.current?.pause();
      return;
    }
    setIdx(n);
  }
  function prev() {
    
    wantPlayingRef.current = true;
    // Prev always steps backward through the linear order, regardless of
    // shuffle. Wraps if loop != "off".
    setIdx((i) => {
      if (i > 0) return i - 1;
      return loop === "off" ? 0 : tracks.length - 1;
    });
  }

  // Hard cleanup on unmount + on tab close. React unmount only fires
  // when the component itself is removed (rare for a layout-level
  // player). For tab close / page navigation we hook the browser's
  // pagehide event, which fires reliably across all browsers when the
  // page is being torn down. visibilitychange catches the case where
  // the tab is hidden but not yet closed (mobile Safari, background
  // tabs). Without these, the browser can keep the audio decoder
  // alive in a process that survives the visible tab, producing the
  // "music kept playing after I closed the browser" bug.
  useEffect(() => {
    function killAudio() {
      const el = audioRef.current;
      if (!el) return;
      try {
        el.pause();
        el.src = "";
        el.load();
      } catch {
        /* element already detached */
      }
    }
    function onVis() {
      if (document.visibilityState === "hidden") {
        // Just pause when hidden, src stays so resuming the tab
        // resumes from the same spot. Full teardown happens on
        // pagehide (the actual close).
        audioRef.current?.pause();
      }
    }
    window.addEventListener("pagehide", killAudio);
    window.addEventListener("beforeunload", killAudio);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      killAudio();
      window.removeEventListener("pagehide", killAudio);
      window.removeEventListener("beforeunload", killAudio);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Cleanup hook for stale service workers + caches from earlier
  // deployments (web-push prototype, etc.). Without this, a returning
  // visitor whose browser registered the old SW can have it intercept
  // requests + keep audio context alive in the background. Runs once
  // per page load, idempotent.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const r of regs) r.unregister().catch(() => {});
      })
      .catch(() => {});
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => {
          for (const k of keys) caches.delete(k).catch(() => {});
        })
        .catch(() => {});
    }
  }, []);

  // Don't render anything until we know there are tracks. (Early return
  // is safe HERE because every hook above runs unconditionally on every
  // render, satisfying the rules-of-hooks invariant.)
  if (tracks.length === 0) return null;
  const track = tracks[idx];

  // The <audio> element is rendered ALWAYS (regardless of open) so that
  // minimizing the panel doesn't unmount it and stop playback. The visual
  // panel (controls + info) toggles open; the audio engine keeps running
  // in the background.
  const audioElement = (
    <audio
      ref={audioRef}
      src={track.public_url}
      // Native HTML loop is OFF, our JS pickNext / onEnded logic
      // owns the repeat decision (Loop one / all / off + brand-song
      // autoplay no-repeat path). Setting this explicitly so the
      // browser can never auto-loop behind our back.
      loop={false}
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
  );

  // CRITICAL: the <audio> element MUST live at a stable position in the
  // React tree across `open` toggles. If we put it inside the panel <div>
  // when open and inside a fragment when closed, React's reconciler sees
  // a different DOM parent and unmounts+remounts the audio, killing
  // playback. Rendering it as a fragment sibling on BOTH branches keeps
  // the same DOM node alive so audio survives minimize.
  // Pair: a tiny mute toggle next to the FAB so listeners can hush
  // the brand-song autoplay without expanding the panel. Mute is
  // intentionally NOT a user-interaction signal, hitting mute is
  // "shut this up" not "I want more songs," so the autoplay-once
  // invariant still holds (track ends, playlist stays silent until
  // the user actually clicks Play / Next / Prev).
  const minimizedFab = (
    <div className="music-fab-stack">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={muted}
        title={muted ? "Unmute" : "Mute"}
        className="music-fab-mute"
      >
        {muted ? "🔇" : "🔊"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={playing ? `Music playing: ${track.title}, expand player` : "Open music player"}
        className="music-fab music-fab-holo"
        title={playing ? `♪ ${track.title}` : "Open music player"}
      >
        <span className="music-fab-spin">
          <span style={{ color: "var(--accent)", fontSize: "1.1rem" }}>
            {playing && !muted ? "♫" : "♪"}
          </span>
          <span className="music-fab-label"> {muted ? "Muted" : playing ? "Playing" : "Music"}</span>
        </span>
      </button>
    </div>
  );

  if (!open) {
    return (
      <>
        {audioElement}
        {minimizedFab}
      </>
    );
  }

  return (
    <>
      {audioElement}
      <div className="music-panel music-panel-holo">

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
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
        {/* Minimize collapses the panel back to the FAB but keeps audio
            playing. The X-style close button has been replaced because
            users were reading it as "stop the music entirely." */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Minimize music player"
          title="Minimize (keeps playing)"
          className="btn btn-ghost"
          style={{ height: 24, width: 24, padding: 0, fontSize: "1.1rem", minWidth: 0, lineHeight: 1 }}
        >
          –
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
          onClick={() => { setShuffle((v) => !v); }}
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
          onClick={() => { setLoop((m) => (m === "off" ? "all" : m === "all" ? "one" : "off")); }}
          aria-label={`Loop ${loop}`}
          title={loop === "off" ? "Loop off, stop at end" : loop === "all" ? "Loop playlist" : "Loop one, repeat track"}
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
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          title={muted ? "Unmute" : "Mute"}
          style={{
            width: 32,
            height: 28,
            padding: 0,
            borderRadius: 6,
            background: muted ? "rgba(255,107,107,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${muted ? "rgba(255,107,107,0.45)" : "rgba(255,255,255,0.1)"}`,
            color: muted ? "var(--alert)" : "var(--text-muted)",
            cursor: "pointer",
            fontSize: "0.95rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {muted ? "🔇" : volume === 0 ? "🔈" : volume < 0.5 ? "🔉" : "🔊"}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => { setVolume(Number(e.target.value)); }}
          style={{
            flex: 1,
            accentColor: "var(--accent)",
            opacity: muted ? 0.4 : 1,
            transition: "opacity 0.15s",
          }}
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
    </>
  );
}
