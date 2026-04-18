-- Admin user-management RPCs. Two functions, both SECURITY DEFINER so they
-- can read auth.users (otherwise locked down by Supabase), with an internal
-- check that the caller has profiles.is_admin = true. Anyone else gets an
-- exception.
--
-- Why RPC rather than a view: we need to JOIN auth.users but also gate it
-- by caller role. A SECURITY DEFINER function lets us do that in one place.

-- =============================================================================
-- admin_list_users() -> table of merged user + profile data
-- =============================================================================

create or replace function public.admin_list_users()
returns table (
    id                  uuid,
    email               text,
    display_name        text,
    rsi_handle          text,
    discord_username    text,
    avatar_url          text,
    provider            text,
    is_admin            boolean,
    is_moderator        boolean,
    created_at          timestamptz,
    last_sign_in_at     timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Gate: caller must be flagged admin
    if not exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_admin = true
    ) then
        raise exception 'admin_list_users: not authorized';
    end if;

    return query
    select
        u.id,
        u.email,
        p.display_name,
        p.rsi_handle,
        coalesce(
            u.raw_user_meta_data ->> 'preferred_username',
            u.raw_user_meta_data ->> 'user_name',
            u.raw_user_meta_data ->> 'full_name',
            u.raw_user_meta_data ->> 'name'
        )::text as discord_username,
        coalesce(
            u.raw_user_meta_data ->> 'avatar_url',
            u.raw_user_meta_data ->> 'picture'
        )::text as avatar_url,
        coalesce(
            u.raw_app_meta_data ->> 'provider',
            'email'
        )::text as provider,
        coalesce(p.is_admin, false) as is_admin,
        coalesce(p.is_moderator, false) as is_moderator,
        u.created_at,
        u.last_sign_in_at
    from auth.users u
    left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;

-- =============================================================================
-- admin_set_role(target_user_id, role, value) — flip is_moderator / is_admin
-- =============================================================================

create or replace function public.admin_set_role(
    target_user_id uuid,
    role_name text,
    value boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_is_admin boolean;
begin
    select coalesce(p.is_admin, false) into caller_is_admin
    from public.profiles p
    where p.id = auth.uid();

    if not coalesce(caller_is_admin, false) then
        raise exception 'admin_set_role: not authorized';
    end if;

    if role_name not in ('is_moderator', 'is_admin') then
        raise exception 'admin_set_role: invalid role %, must be is_moderator or is_admin', role_name;
    end if;

    -- Belt-and-suspenders: don't let admin accidentally remove their own
    -- admin flag (could lock themselves out). Leaving a soft warning — they
    -- can still do it by using SQL directly, but the UI shouldn't make it
    -- easy.
    if target_user_id = auth.uid() and role_name = 'is_admin' and value = false then
        raise exception 'admin_set_role: refusing to remove own admin flag via RPC';
    end if;

    -- Upsert-style — ensure a profiles row exists before flipping
    insert into public.profiles (id)
    values (target_user_id)
    on conflict (id) do nothing;

    if role_name = 'is_moderator' then
        update public.profiles set is_moderator = value where id = target_user_id;
    elsif role_name = 'is_admin' then
        update public.profiles set is_admin = value where id = target_user_id;
    end if;
end;
$$;

grant execute on function public.admin_set_role(uuid, text, boolean) to authenticated;
