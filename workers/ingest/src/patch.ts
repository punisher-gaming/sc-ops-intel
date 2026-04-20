// Auto-detect the current Star Citizen patch version by reading the latest
// commit on StarCitizenWiki/scunpacked-data master. Their commit messages
// follow the pattern "4.7.0-LIVE.11592622\n\n...", the first line IS the
// patch identifier they extracted from. Robust because it tracks the actual
// data we're ingesting, not a separate version feed that could drift.
//
// We strip the build suffix ("4.7.0-LIVE.11592622" → "4.7.0-LIVE") so the
// version stamp matches what users see in-game and in patch notes.
//
// Falls back to env.CURRENT_GAME_VERSION on any failure so a GitHub outage
// can't break ingest.

import type { Env } from "./supabase";

const COMMITS_URL =
  "https://api.github.com/repos/StarCitizenWiki/scunpacked-data/commits/master";

export async function detectPatchVersion(env: Env): Promise<string> {
  try {
    const res = await fetch(COMMITS_URL, {
      headers: {
        accept: "application/vnd.github+json",
        // GitHub requires a User-Agent header on API requests
        "user-agent": "sc-ops-intel-ingest-worker",
      },
      cf: { cacheTtl: 600, cacheEverything: true },
    });
    if (!res.ok) {
      console.warn(`[detectPatchVersion] HTTP ${res.status}, falling back`);
      return env.CURRENT_GAME_VERSION;
    }
    const body = (await res.json()) as { commit?: { message?: string } };
    const msg = body.commit?.message ?? "";
    const firstLine = msg.split(/\r?\n/, 1)[0]?.trim() ?? "";
    // Pattern: "<major>.<minor>.<patch>-<channel>[.<build>]"
    // We keep the channel ("LIVE" / "PTU" / etc.) but drop the trailing build.
    const match = firstLine.match(/^(\d+\.\d+\.\d+(?:[.-]\d+)?-[A-Z]+)/);
    if (match) return match[1];
    // Looser fallback, first whitespace-delimited token if it looks versiony
    const loose = firstLine.match(/^(\d+\.\d+[\d.A-Z\-]*)/);
    if (loose) return loose[1];
    console.warn(
      `[detectPatchVersion] unrecognized commit msg "${firstLine}", falling back`,
    );
    return env.CURRENT_GAME_VERSION;
  } catch (e) {
    console.warn("[detectPatchVersion] failed:", e);
    return env.CURRENT_GAME_VERSION;
  }
}
