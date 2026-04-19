import { supabase, type Env } from "./supabase";
import { detectPatchVersion } from "./patch";
import { ingestShips } from "./ingest/ships";
import { ingestManufacturers } from "./ingest/manufacturers";
import { ingestResources, ingestResourceLocations } from "./ingest/resources";
import { ingestCommodities } from "./ingest/commodities";
import { ingestTradeLocations } from "./ingest/trade-locations";
import { ingestBlueprints } from "./ingest/blueprints";
import { ingestShops } from "./ingest/shops";
import { ingestCommodityAvailability } from "./ingest/availability";
import { ingestItems } from "./ingest/items";

const ROUTES = `
SC OPS INTEL ingest worker

GET  /health
GET  /patch                        (detected current patch version)
POST /ingest/ships                 (SC Wiki API)
POST /ingest/manufacturers         (scunpacked)
POST /ingest/resources             (scunpacked)
POST /ingest/resource-locations    (scunpacked, depends on /resources)
POST /ingest/commodities           (scunpacked)
POST /ingest/trade-locations       (scunpacked)
POST /ingest/blueprints            (scunpacked)
POST /ingest/shops                 (scunpacked.com — shops + inventory)
POST /ingest/availability          (scunpacked — commodity availability, ~43 MB streamed)
POST /ingest/items                 (scunpacked items.json — weapons + components, ~107 MB streamed)
POST /ingest/all                   (everything, in dependency order)
`;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, version: env.CURRENT_GAME_VERSION });
    }

    if (url.pathname === "/patch") {
      const detected = await detectPatchVersion(env);
      return Response.json({
        configured: env.CURRENT_GAME_VERSION,
        detected,
        using: detected,
      });
    }

    // For ingest routes, auto-detect the patch version once and pin it onto
    // env so downstream modules pick it up via env.CURRENT_GAME_VERSION
    // without needing per-module wiring.
    const detected = await detectPatchVersion(env);
    env = { ...env, CURRENT_GAME_VERSION: detected };
    const client = supabase(env);

    if (url.pathname === "/ingest/ships") {
      return Response.json(await ingestShips(client, env));
    }
    if (url.pathname === "/ingest/manufacturers") {
      return Response.json(await ingestManufacturers(client, env));
    }
    if (url.pathname === "/ingest/resources") {
      return Response.json(await ingestResources(client, env));
    }
    if (url.pathname === "/ingest/resource-locations") {
      return Response.json(await ingestResourceLocations(client, env));
    }
    if (url.pathname === "/ingest/commodities") {
      return Response.json(await ingestCommodities(client, env));
    }
    if (url.pathname === "/ingest/trade-locations") {
      return Response.json(await ingestTradeLocations(client, env));
    }
    if (url.pathname === "/ingest/blueprints") {
      return Response.json(await ingestBlueprints(client, env));
    }
    if (url.pathname === "/ingest/shops") {
      return Response.json(await ingestShops(client, env));
    }
    if (url.pathname === "/ingest/availability") {
      return Response.json(await ingestCommodityAvailability(client, env));
    }
    if (url.pathname === "/ingest/items") {
      return Response.json(await ingestItems(client, env));
    }

    if (url.pathname === "/ingest/all") {
      const results = await runAll(client, env);
      return Response.json({ patch: detected, ...results });
    }

    return new Response(ROUTES, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Each ingest is run as a SEPARATE Worker invocation via self-fetch so it
    // gets its own CPU + subrequest budget. Running all 8 sequentially in one
    // invocation blew the 30s CPU cap. With self-fetch the cron handler only
    // needs 8 subrequests of its own (one per ingest) and each downstream
    // /ingest/<X> call runs fresh.
    //
    // Endpoints are called sequentially (not parallel) to respect ingest
    // dependency order — resource_locations needs resources to exist first.
    const SELF = "https://sc-ops-intel-ingest.clint-150.workers.dev";
    const ENDPOINTS = [
      "/ingest/ships",
      "/ingest/manufacturers",
      "/ingest/resources",
      "/ingest/resource-locations",
      "/ingest/commodities",
      "/ingest/trade-locations",
      "/ingest/blueprints",
      "/ingest/shops",
    ];
    ctx.waitUntil(
      (async () => {
        const detected = await detectPatchVersion(env);
        console.log(`[cron] using patch ${detected}`);
        const summary: Record<string, unknown> = { patch: detected };
        for (const path of ENDPOINTS) {
          // One retry — Cloudflare occasionally returns CPU-limit (1102) on
          // cold-start invocations even for ingests that normally fit in
          // budget. A single retry after a 2s pause clears most of those.
          let body: unknown;
          let lastErr = "";
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const res = await fetch(`${SELF}${path}`, { method: "POST" });
              if (!res.ok) {
                lastErr = `HTTP ${res.status}`;
                if (attempt === 0) await new Promise((r) => setTimeout(r, 2000));
                continue;
              }
              body = await res.json();
              break;
            } catch (e) {
              lastErr = (e as Error).message ?? String(e);
              if (attempt === 0) await new Promise((r) => setTimeout(r, 2000));
            }
          }
          if (body === undefined) body = { ok: false, error: lastErr };
          summary[path] = body;
          console.log(`[cron] ${path}:`, JSON.stringify(body));
        }
        console.log("[cron] DONE:", JSON.stringify(summary));
      })(),
    );
  },
};

// Dependency order:
//   1. ships                 (standalone, SC Wiki)
//   2. manufacturers         (lookup)
//   3. resources             (needed before resource_locations)
//   4. resource-locations    (FK on resources)
//   5. commodities           (lookup)
//   6. trade-locations       (lookup)
//   7. blueprints            (FK on blueprint_sources, self-contained)
//   8. shops                 (standalone, scunpacked.com — 12 MB, fits)
//
// NOT in the nightly cron — these source files (43 MB and 107 MB) exceed the
// per-invocation subrequest cap (50 on Workers Free) even with maxed batch
// sizes. The routes still exist for manual trigger from a beefier plan, and
// scripts/ingest-availability.mjs + scripts/ingest-items.mjs remain the
// patch-day fallback. Items + availability only need to refresh on patches
// (~3-4x/year) so this is acceptable.
//
// safeRun wraps each ingest so one bad source can't kill the rest of the run.
async function runAll(client: ReturnType<typeof supabase>, env: Env) {
  const ships = await safeRun("ships", () => ingestShips(client, env));
  const manufacturers = await safeRun("manufacturers", () => ingestManufacturers(client, env));
  const resources = await safeRun("resources", () => ingestResources(client, env));
  const resourceLocations = await safeRun("resource_locations", () => ingestResourceLocations(client, env));
  const commodities = await safeRun("commodities", () => ingestCommodities(client, env));
  const tradeLocations = await safeRun("trade_locations", () => ingestTradeLocations(client, env));
  const blueprints = await safeRun("blueprints", () => ingestBlueprints(client, env));
  const shops = await safeRun("shops", () => ingestShops(client, env));
  return {
    ships,
    manufacturers,
    resources,
    resource_locations: resourceLocations,
    commodities,
    trade_locations: tradeLocations,
    blueprints,
    shops,
  };
}

async function safeRun<T>(name: string, fn: () => Promise<T>): Promise<T | { ok: false; error: string }> {
  try {
    return await fn();
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.error(`[cron] ${name} threw:`, msg);
    return { ok: false, error: msg };
  }
}
