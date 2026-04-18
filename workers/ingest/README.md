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
curl -X POST https://sc-ops-intel-ingest.<subdomain>.workers.dev/ingest/ships
curl -X POST https://sc-ops-intel-ingest.<subdomain>.workers.dev/ingest/all
curl https://sc-ops-intel-ingest.<subdomain>.workers.dev/health
```

## Cron

Configured in `wrangler.toml` as `crons = ["0 3 * * *"]` — 03:00 UTC daily.

## Environment

- `SUPABASE_URL` — var (public, in wrangler.toml)
- `SUPABASE_SECRET_KEY` — secret (bypasses RLS)
- `SC_WIKI_BASE` — var
- `CURRENT_GAME_VERSION` — var, bump in wrangler.toml when a new SC patch drops so rows get re-tagged
