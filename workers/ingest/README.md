# sc-ops-intel-ingest

Cloudflare Worker that pulls Star Citizen game data from the [SC Wiki API](https://api.star-citizen.wiki) and upserts into the `sc-ops-intel` Supabase project. Runs daily at 03:00 UTC and can be triggered manually via HTTP.

## First-time setup

From `workers/ingest/`:

```sh
npm install
npx wrangler login                      # browser-opens Cloudflare login
npx wrangler secret put SUPABASE_SECRET_KEY
# (paste the sb_secret_... key when prompted; never committed)
npx wrangler deploy
```

The deploy output prints the worker URL, something like:
`https://sc-ops-intel-ingest.<your-subdomain>.workers.dev`

## Manual triggers

```sh
# SC Wiki API
curl -X POST https://sc-ops-intel-ingest.<subdomain>.workers.dev/ingest/ships

# scunpacked-data
curl -X POST https://sc-ops-intel-ingest.<subdomain>.workers.dev/ingest/manufacturers
curl -X POST https://sc-ops-intel-ingest.<subdomain>.workers.dev/ingest/resources
curl -X POST https://sc-ops-intel-ingest.<subdomain>.workers.dev/ingest/resource-locations
curl -X POST https://sc-ops-intel-ingest.<subdomain>.workers.dev/ingest/commodities
curl -X POST https://sc-ops-intel-ingest.<subdomain>.workers.dev/ingest/trade-locations
curl -X POST https://sc-ops-intel-ingest.<subdomain>.workers.dev/ingest/blueprints

# Everything in dependency order
curl -X POST https://sc-ops-intel-ingest.<subdomain>.workers.dev/ingest/all

curl https://sc-ops-intel-ingest.<subdomain>.workers.dev/health
```

## Data sources

- **SC Wiki API** (api.star-citizen.wiki) — ships
- **scunpacked-data** (github.com/StarCitizenWiki/scunpacked-data) —
  manufacturers, resources, resource locations, commodities, trade locations,
  blueprints. Raw JSON served from GitHub; no auth required. The 107 MB
  `items.json` is LFS-backed and currently skipped; item metadata is derived
  opportunistically from blueprint outputs.

## Ingest audit log

Every ingest run records a row in `public.ingest_runs` (source, status,
rows_upserted, duration_ms, message, started_at, finished_at). Query it in
Supabase to see what ran when and whether it succeeded.

## Cron

Configured in `wrangler.toml` as `crons = ["0 3 * * *"]` — 03:00 UTC daily.

## Environment

- `SUPABASE_URL` — var (public, in wrangler.toml)
- `SUPABASE_SECRET_KEY` — secret (bypasses RLS)
- `SC_WIKI_BASE` — var
- `CURRENT_GAME_VERSION` — var, bump in wrangler.toml when a new SC patch drops so rows get re-tagged
