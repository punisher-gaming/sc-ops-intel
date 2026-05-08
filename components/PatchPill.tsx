"use client";

import { useEffect, useState } from "react";

// Fallback baseline, used until the live fetch resolves AND when the
// worker is unreachable. Hand-bumped on patch day as a safety net so
// the nav never shows nothing.
export const CURRENT_PATCH = "4.7.2";

const WORKER_PATCH_URL =
  "https://sc-ops-intel-ingest.clint-150.workers.dev/patch";

// localStorage cache so we don't refetch on every page nav. 6h TTL is
// short enough to pick up patch-day changes within the same session,
// long enough to avoid spamming the worker.
const CACHE_KEY = "citizendex.patch.v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface CacheEntry {
  version: string;
  fetchedAt: number;
}

function readCache(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.version;
  } catch {
    return null;
  }
}

function writeCache(version: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ version, fetchedAt: Date.now() } satisfies CacheEntry),
    );
  } catch {
    /* localStorage full / disabled, harmless */
  }
}

/** Format the worker's "4.7.2-LIVE" / "4.7.2-PTU" payload for display.
 *  Drop the "-LIVE" suffix since that's the default channel; keep PTU /
 *  EPTU / TECH-PREVIEW etc. so power users can tell what's running. */
function formatVersion(raw: string): string {
  return raw.replace(/-LIVE$/i, "");
}

/** React hook, returns the current patch version. Starts with the
 *  hardcoded fallback for the very first paint, then upgrades to the
 *  live worker-detected value (if available + different). Single-fetch
 *  per session via the localStorage cache. */
export function useCurrentPatch(): string {
  const [version, setVersion] = useState<string>(() => {
    return readCache() ?? CURRENT_PATCH;
  });

  useEffect(() => {
    let cancelled = false;
    // If we already had a fresh cache hit, don't refetch on this mount.
    if (readCache()) return;
    fetch(WORKER_PATCH_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { using?: string } | null) => {
        if (cancelled || !body?.using) return;
        const formatted = formatVersion(body.using);
        writeCache(formatted);
        setVersion((prev) => (prev === formatted ? prev : formatted));
      })
      .catch(() => {
        /* keep fallback, the worker may be cold or offline */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return version;
}

export function PatchPill() {
  return null;
}
