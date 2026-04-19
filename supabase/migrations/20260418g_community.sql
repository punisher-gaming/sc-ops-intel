-- Community: forum-style threads + replies + voting, plus a couple of
-- starter categories. RLS makes everything publicly readable; only the
-- author can edit their own posts; moderators can pin/lock/delete.

-- ============================================================================
-- Categories — admin-curated list of topics. Seeded with sensible defaults.
-- ============================================================================

create table public.chat_categories (
    id              text primary key,            -- e.g. 'general', 'mining'
    name            text not null,
    description     text,
    display_order   integer not null default 100,
    created_at      timestamptz not null default now()
);

alter table public.chat_categories enable row level security;
create policy "chat_categories public read" on public.chat_categories for select using (true);
create policy "chat_categories admin write" on public.chat_categories
    for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

insert into public.chat_categories (id, name, description, display_order) values
    ('general',  'General',  'Anything Star Citizen — questions, intros, off-topic', 10),
    ('fleet',    'Fleet ops','Org events, missions, callouts',                       20),
    ('mining',   'Mining',   'Routes, ROC tips, refinery yields',                    30),
    ('trading',  'Trading',  'Profitable runs, terminal stock alerts',               40),
    ('combat',   'Combat',   'Bounty hunting, dogfights, FPS',                       50),
    ('crafting', 'Crafting', 'Blueprint hunting, recipe theorycrafting',             60),
    ('bug-reports', 'Bug reports', 'In-game bugs, RSI issues, workarounds',          90)
on conflict (id) do nothing;

-- ============================================================================
-- Threads — top-level posts in a category
-- ============================================================================

create table public.chat_threads (
    id              uuid primary key default gen_random_uuid(),
    category_id     text not null references public.chat_categories(id) on delete restrict,
    user_id         uuid not null references auth.users(id) on delete cascade,
    title           text not null check (char_length(title) between 1 and 200),
    body            text not null check (char_length(body) <= 8000),
    pinned          boolean not null default false,
    locked          boolean not null default false,
    deleted         boolean not null default false,
    score           integer not null default 0,            -- denormalised vote tally
    reply_count     integer not null default 0,            -- denormalised
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    last_activity_at timestamptz not null default now()    -- for "hot" sort
);

alter table public.chat_threads enable row level security;

create policy "chat_threads public read" on public.chat_threads
    for select using (deleted = false);
create policy "chat_threads moderator read all" on public.chat_threads
    for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true));

create policy "chat_threads authed insert" on public.chat_threads
    for insert with check (auth.uid() = user_id);
create policy "chat_threads author update own" on public.chat_threads
    for update
    using (auth.uid() = user_id and deleted = false and locked = false)
    with check (auth.uid() = user_id and deleted = false);

-- Moderators can update any thread (pin/lock/delete)
create policy "chat_threads moderator update" on public.chat_threads
    for update
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true));

create index chat_threads_category_idx on public.chat_threads (category_id, last_activity_at desc) where deleted = false;
create index chat_threads_pinned_idx on public.chat_threads (category_id, pinned desc, last_activity_at desc) where deleted = false;
create index chat_threads_score_idx on public.chat_threads (score desc) where deleted = false;
create index chat_threads_user_idx on public.chat_threads (user_id);

create trigger chat_threads_set_updated_at
    before update on public.chat_threads
    for each row execute function public.set_updated_at();

-- ============================================================================
-- Replies — flat (no nested threading in v1)
-- ============================================================================

create table public.chat_replies (
    id              uuid primary key default gen_random_uuid(),
    thread_id       uuid not null references public.chat_threads(id) on delete cascade,
    user_id         uuid not null references auth.users(id) on delete cascade,
    body            text not null check (char_length(body) between 1 and 4000),
    deleted         boolean not null default false,
    score           integer not null default 0,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

alter table public.chat_replies enable row level security;

create policy "chat_replies public read" on public.chat_replies
    for select using (deleted = false);
create policy "chat_replies moderator read all" on public.chat_replies
    for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true));

create policy "chat_replies authed insert" on public.chat_replies
    for insert with check (
        auth.uid() = user_id
        and exists (select 1 from public.chat_threads t where t.id = thread_id and t.deleted = false and t.locked = false)
    );
create policy "chat_replies author update own" on public.chat_replies
    for update
    using (auth.uid() = user_id and deleted = false)
    with check (auth.uid() = user_id and deleted = false);
create policy "chat_replies moderator update" on public.chat_replies
    for update
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true));

create index chat_replies_thread_idx on public.chat_replies (thread_id, created_at) where deleted = false;
create index chat_replies_user_idx on public.chat_replies (user_id);

create trigger chat_replies_set_updated_at
    before update on public.chat_replies
    for each row execute function public.set_updated_at();

-- ============================================================================
-- Votes — one per user per target. Trigger keeps thread/reply.score in sync
-- and bumps last_activity_at for "hot" sort.
-- ============================================================================

create type chat_vote_target as enum ('thread', 'reply');

create table public.chat_votes (
    user_id         uuid not null references auth.users(id) on delete cascade,
    target_type     chat_vote_target not null,
    target_id       uuid not null,
    value           smallint not null check (value in (-1, 1)),
    created_at      timestamptz not null default now(),
    primary key (user_id, target_type, target_id)
);

alter table public.chat_votes enable row level security;
create policy "chat_votes public read" on public.chat_votes for select using (true);
create policy "chat_votes own insert" on public.chat_votes
    for insert with check (auth.uid() = user_id);
create policy "chat_votes own update" on public.chat_votes
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "chat_votes own delete" on public.chat_votes
    for delete using (auth.uid() = user_id);

create index chat_votes_target_idx on public.chat_votes (target_type, target_id);

-- Score sync trigger
create or replace function public.chat_apply_vote()
returns trigger
language plpgsql
as $$
declare
    delta integer;
    target_id_val uuid;
    target_type_val chat_vote_target;
begin
    if tg_op = 'INSERT' then
        delta := new.value;
        target_id_val := new.target_id;
        target_type_val := new.target_type;
    elsif tg_op = 'DELETE' then
        delta := -old.value;
        target_id_val := old.target_id;
        target_type_val := old.target_type;
    elsif tg_op = 'UPDATE' then
        delta := new.value - old.value;
        target_id_val := new.target_id;
        target_type_val := new.target_type;
    end if;

    if target_type_val = 'thread' then
        update public.chat_threads set score = score + delta, last_activity_at = now()
        where id = target_id_val;
    else
        update public.chat_replies set score = score + delta where id = target_id_val;
        update public.chat_threads set last_activity_at = now()
        where id = (select thread_id from public.chat_replies where id = target_id_val);
    end if;
    return null;
end;
$$;

create trigger chat_votes_apply
    after insert or update or delete on public.chat_votes
    for each row execute function public.chat_apply_vote();

-- Reply count + activity trigger
create or replace function public.chat_reply_bump()
returns trigger
language plpgsql
as $$
begin
    if tg_op = 'INSERT' then
        update public.chat_threads
        set reply_count = reply_count + 1, last_activity_at = now()
        where id = new.thread_id;
    elsif tg_op = 'UPDATE' and old.deleted = false and new.deleted = true then
        update public.chat_threads
        set reply_count = greatest(reply_count - 1, 0)
        where id = new.thread_id;
    end if;
    return null;
end;
$$;

create trigger chat_replies_bump
    after insert or update on public.chat_replies
    for each row execute function public.chat_reply_bump();

-- ============================================================================
-- Public author view — joins profiles + auth.users metadata so anonymous
-- visitors can see thread / reply authors with Discord avatar + name. Uses
-- a SECURITY DEFINER function because anon can't read auth.users directly.
-- ============================================================================

create or replace function public.chat_author(uid uuid)
returns table (
    id uuid,
    display_name text,
    discord_username text,
    avatar_url text,
    is_moderator boolean,
    is_admin boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    select
        u.id,
        coalesce(p.display_name,
                 u.raw_user_meta_data ->> 'preferred_username',
                 u.raw_user_meta_data ->> 'user_name',
                 u.raw_user_meta_data ->> 'full_name',
                 u.raw_user_meta_data ->> 'name',
                 split_part(u.email, '@', 1))::text as display_name,
        coalesce(u.raw_user_meta_data ->> 'preferred_username',
                 u.raw_user_meta_data ->> 'user_name',
                 u.raw_user_meta_data ->> 'full_name',
                 u.raw_user_meta_data ->> 'name')::text as discord_username,
        coalesce(u.raw_user_meta_data ->> 'avatar_url',
                 u.raw_user_meta_data ->> 'picture')::text as avatar_url,
        coalesce(p.is_moderator, false) as is_moderator,
        coalesce(p.is_admin, false) as is_admin
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = uid;
end;
$$;

grant execute on function public.chat_author(uuid) to anon, authenticated;

-- Bulk variant: takes an array of uids, returns the joined rows. Lets the
-- thread list fetch all author cards in one round-trip.
create or replace function public.chat_authors(uids uuid[])
returns table (
    id uuid,
    display_name text,
    discord_username text,
    avatar_url text,
    is_moderator boolean,
    is_admin boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    select
        u.id,
        coalesce(p.display_name,
                 u.raw_user_meta_data ->> 'preferred_username',
                 u.raw_user_meta_data ->> 'user_name',
                 u.raw_user_meta_data ->> 'full_name',
                 u.raw_user_meta_data ->> 'name',
                 split_part(u.email, '@', 1))::text,
        coalesce(u.raw_user_meta_data ->> 'preferred_username',
                 u.raw_user_meta_data ->> 'user_name',
                 u.raw_user_meta_data ->> 'full_name',
                 u.raw_user_meta_data ->> 'name')::text,
        coalesce(u.raw_user_meta_data ->> 'avatar_url',
                 u.raw_user_meta_data ->> 'picture')::text,
        coalesce(p.is_moderator, false),
        coalesce(p.is_admin, false)
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = any(uids);
end;
$$;

grant execute on function public.chat_authors(uuid[]) to anon, authenticated;
