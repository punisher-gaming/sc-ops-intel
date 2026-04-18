import { supabase, type Env } from "./supabase";
import { ingestShips } from "./ingest/ships";

export default {
  // Manual trigger — hit the worker URL in a browser or via curl.
  // Useful for first-run, debugging, and on-demand refreshes.
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, version: env.CURRENT_GAME_VERSION });
    }

    if (url.pathname === "/ingest/ships") {
      const client = supabase(env);
      const result = await ingestShips(client, env);
      return Response.json(result);
    }

    if (url.pathname === "/ingest/all") {
      const client = supabase(env);
      const ships = await ingestShips(client, env);
      // weapons, components, commodities, blueprints, resources → add as each mapper is built
      return Response.json({ ships });
    }

    return new Response(
      `SC OPS INTEL ingest worker\n\nroutes:\n  GET /health\n  POST /ingest/ships\n  POST /ingest/all\n`,
      { status: 200, headers: { "content-type": "text/plain" } },
    );
  },

  // Cron trigger — wrangler.toml schedules this daily at 03:00 UTC.
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const client = supabase(env);
    ctx.waitUntil(
      (async () => {
        const result = await ingestShips(client, env);
        console.log("[cron] ships ingest:", JSON.stringify(result));
      })(),
    );
  },
};
