-- public_staff_list() — anonymous-readable list of admins + moderators with
-- their Discord display info pulled from auth.users.raw_user_meta_data.
-- Used by the homepage credits panel ("please respect our staff").
--
-- Why SECURITY DEFINER: auth.users isn't readable from anon clients, but we
-- only return the safe display fields (no email, no last_sign_in_at) and
-- only for users explicitly flagged as staff. Function is grant-able to
-- anon + authenticated so the homepage can render it without a session.

create or replace function public.public_staff_list()
returns table (
    id               uuid,
    display_name     text,
    discord_username text,
    avatar_url       text,
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
        coalesce(p.is_admin, false) as is_admin,
        coalesce(p.is_moderator, false) as is_moderator
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.is_admin = true or p.is_moderator = true
    -- Admins first, then moderators, then alphabetical within each group
    order by p.is_admin desc, p.is_moderator desc, lower(coalesce(p.display_name, ''));
$$;

grant execute on function public.public_staff_list() to anon, authenticated;
