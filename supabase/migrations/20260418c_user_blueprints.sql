-- user_blueprints: per-user "I own this blueprint" tracker.
-- Used by the /blueprints list to let logged-in users mark which BPs they've
-- already unlocked, then filter to "missing only" to focus on what to farm.

create table public.user_blueprints (
    user_id         uuid not null references auth.users(id) on delete cascade,
    blueprint_id    text not null references public.blueprints(id) on delete cascade,
    notes           text,
    created_at      timestamptz not null default now(),
    primary key (user_id, blueprint_id)
);

alter table public.user_blueprints enable row level security;

create policy "user_blueprints owner read" on public.user_blueprints
    for select using (auth.uid() = user_id);

create policy "user_blueprints owner insert" on public.user_blueprints
    for insert with check (auth.uid() = user_id);

create policy "user_blueprints owner delete" on public.user_blueprints
    for delete using (auth.uid() = user_id);

create policy "user_blueprints owner update" on public.user_blueprints
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index user_blueprints_user_idx on public.user_blueprints (user_id);
