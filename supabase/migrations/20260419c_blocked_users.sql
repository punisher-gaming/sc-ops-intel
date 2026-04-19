-- Blocked Discord users — prevents specific Discord accounts from completing
-- signup. Enforced via a BEFORE INSERT trigger on auth.users that compares
-- the incoming raw_user_meta_data.provider_id (Discord's snowflake) against
-- a blocklist table.
--
-- Why a table not a hardcoded check: lets admins add/remove without DDL,
-- and lets the frontend render a "you've been blocked" message tied to the
-- specific block reason if we ever want that.

create table if not exists public.blocked_discord_ids (
    discord_id  text primary key,
    reason      text,
    added_by    uuid references auth.users(id) on delete set null,
    added_at    timestamptz not null default now()
);

-- No public RLS — only service role / SQL editor reads/writes this.
alter table public.blocked_discord_ids enable row level security;
-- Admins can SELECT (so an admin UI could surface the list). No INSERT
-- policy → only service role / direct SQL can add entries. That's deliberate.
drop policy if exists "blocked_discord_ids admin read" on public.blocked_discord_ids;
create policy "blocked_discord_ids admin read" on public.blocked_discord_ids
    for select
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
        )
    );

-- The actual gate. Fires on every auth.users INSERT. Discord OAuth lands
-- the snowflake in raw_user_meta_data.provider_id; some flows put it under
-- .sub instead, so we check both. Raising rolls the INSERT back, which
-- causes Supabase to return an error to exchangeCodeForSession() — the
-- client uses that signal to route to /access-denied.
create or replace function public.block_signup_if_blocked()
returns trigger
language plpgsql
security definer
as $$
declare
    incoming_id text;
begin
    incoming_id := coalesce(
        new.raw_user_meta_data ->> 'provider_id',
        new.raw_user_meta_data ->> 'sub'
    );
    if incoming_id is null then
        return new;
    end if;
    if exists (select 1 from public.blocked_discord_ids where discord_id = incoming_id) then
        raise exception 'BLOCKED_DISCORD_USER: signup denied for discord_id %', incoming_id
            using errcode = 'P0001';
    end if;
    return new;
end;
$$;

drop trigger if exists block_signup_if_blocked on auth.users;
create trigger block_signup_if_blocked
    before insert on auth.users
    for each row
    execute function public.block_signup_if_blocked();

-- Seed the initial blocklist entry that motivated this work.
insert into public.blocked_discord_ids (discord_id, reason)
values ('276921487808528384', 'manually blocked')
on conflict (discord_id) do nothing;
