import { supabase, type Env } from "./supabase";
import { ingestShips } from "./ingest/ships";
import { ingestManufacturers } from "./ingest/manufacturers";
import { ingestResources, ingestResourceLocations } from "./ingest/resources";
import { ingestCommodities } from "./ingest/commodities";
import { ingestTradeLocations } from "./ingest/trade-locations";
import { ingestBlueprints } from "./ingest/blueprints";

const ROUTES = `
SC OPS INTEL ingest worker

GET  /health
POST /ingest/ships                 (SC Wiki API)
POST /ingest/manufacturers         (scunpacked)
POST /ingest/resources             (scunpacked)
POST /ingest/resource-locations    (scunpacked, depends on /resources)
POST /ingest/commodities           (scunpacked)
POST /ingest/trade-locations       (scunpacked)
POST /ingest/blueprints            (scunpacked)
POST /ingest/all                   (everything, in dependency order)
`;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const client = supabase(env);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, version: env.CURRENT_GAME_VERSION });
    }

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

    if (url.pathname === "/ingest/all") {
      const results = await runAll(client, env);
      return Response.json(results);
    }

    return new Response(ROUTES, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const client = supabase(env);
    ctx.waitUntil(
      (async () => {
        const results = await runAll(client, env);
        console.log("[cron] ingest results:", JSON.stringify(results));
      })(),
    );
  },
};

// Dependency order:
//   1. ships                 (standalone, SC Wiki)
//   2. manufacturers         (lookup)
//   3. resources             (needed before resource_locations)
//   4. resource-locations    (FK on resources)
//   5. commodities           (standalone)
//   6. trade-locations       (standalone)
//   7. blueprints            (FK on blueprint_sources, self-contained)
async function runAll(client: ReturnType<typeof supabase>, env: Env) {
  const ships = await ingestShips(client, env);
  const manufacturers = await ingestManufacturers(client, env);
  const resources = await ingestResources(client, env);
  const resourceLocations = await ingestResourceLocations(client, env);
  const commodities = await ingestCommodities(client, env);
  const tradeLocations = await ingestTradeLocations(client, env);
  const blueprints = await ingestBlueprints(client, env);
  return {
    ships,
    manufacturers,
    resources,
    resource_locations: resourceLocations,
    commodities,
    trade_locations: tradeLocations,
    blueprints,
  };
}
