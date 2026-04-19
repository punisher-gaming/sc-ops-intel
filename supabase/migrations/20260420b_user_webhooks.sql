-- Per-user Discord notification hook. Each user can paste their own
-- Discord webhook URL into /account; we POST to it (via the worker
-- which acts as CORS proxy) when their auction listings get bought
-- or marked sold. No bot account, no shared server required — the
-- webhook delivers straight to whichever channel the user wired up.
--
-- Why on profiles vs a separate table: it's a single nullable URL
-- per user, RLS already locks profiles to owner-write.

alter table public.profiles
    add column if not exists discord_webhook_url text;

-- Sanity check: must look like a Discord webhook URL if present.
alter table public.profiles
    drop constraint if exists profiles_discord_webhook_url_format;
alter table public.profiles
    add constraint profiles_discord_webhook_url_format
    check (
        discord_webhook_url is null
        or discord_webhook_url ~ '^https://(discord\.com|discordapp\.com)/api/webhooks/[0-9]+/[A-Za-z0-9_\-]+$'
    );
