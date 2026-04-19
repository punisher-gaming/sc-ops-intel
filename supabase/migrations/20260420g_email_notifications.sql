-- Email notification opt-out flag. Defaults to TRUE so every signed-up
-- user has coverage immediately without lifting a finger — they can
-- toggle off from /account if they don't want emails.
--
-- The recipient email itself isn't stored here; the worker reads it
-- from auth.users via the service-role client at send time. Means we
-- always have the most up-to-date address (no stale copy to sync).

alter table public.profiles
    add column if not exists email_notifications_enabled boolean not null default true;
