-- Public-fleet visibility: lets users opt into showing a fleet on their
-- public profile so other community members can browse it.
--
-- Default is FALSE (private) — every existing fleet stays hidden until the
-- owner explicitly flips the toggle. Two RLS policy additions:
--   1. Anyone (incl. anon) can SELECT a fleet that has is_public = true
--   2. The existing owner-read policy still wins for private fleets
--
-- Plus a SECURITY DEFINER RPC public_user_profile(uid) that returns the
-- safe display fields for any user (used by /profile?id=…).

alter table public.user_fleets
    add column if not exists is_public boolean not null default false;

create index if not exists user_fleets_public_idx
    on public.user_fleets (user_id) where is_public = true;

-- Anyone can read public fleets. The owner-only policies remain in place
-- and apply to private rows. PostgREST OR's permissive policies, so this
-- is purely additive.
drop policy if exists "user_fleets public read" on public.user_fleets;
create policy "user_fleets public read" on public.user_fleets
    for select
    using (is_public = true);

-- Public-readable profile for /profile?id=… pages. Same shape as the
-- staff list RPC: only safe display fields, no email or last-sign-in.
create or replace function public.public_user_profile(uid uuid)
returns table (
    id               uuid,
    display_name     text,
    discord_username text,
    avatar_url       text,
    bio              text,
    rsi_handle       text,
    is_admin         boolean,
    is_moderator     boolean
)
language sql
security definer
set search_path = public
stable
as $$
    select
        u.id,
        coalesce(p.display_name, p.discord_handle) as display_name,
        coalesce(
            u.raw_user_meta_data ->> 'preferred_username',
            u.raw_user_meta_data ->> 'user_name',
            u.raw_user_meta_data ->> 'full_name',
            u.raw_user_meta_data ->> 'name',
            p.display_name
        )::text as discord_username,
        coalesce(
            u.raw_user_meta_data ->> 'avatar_url',
            u.raw_user_meta_data ->> 'picture',
            p.avatar_url
        )::text as avatar_url,
        p.bio,
        p.rsi_handle,
        coalesce(p.is_admin, false),
        coalesce(p.is_moderator, false)
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = uid;
$$;

grant execute on function public.public_user_profile(uuid) to anon, authenticated;
