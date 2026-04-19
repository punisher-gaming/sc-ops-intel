-- Saved fleets per user. A fleet is just a named list of ship IDs.
-- The fleet compare page lets users save the current selection,
-- and the account page lists their saved fleets for one-click re-load.

create table public.user_fleets (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id) on delete cascade,
    name            text not null check (char_length(name) between 1 and 100),
    ship_ids        text[] not null check (array_length(ship_ids, 1) between 1 and 100),
    notes           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

alter table public.user_fleets enable row level security;

create policy "user_fleets owner read" on public.user_fleets
    for select using (auth.uid() = user_id);
create policy "user_fleets owner insert" on public.user_fleets
    for insert with check (auth.uid() = user_id);
create policy "user_fleets owner update" on public.user_fleets
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_fleets owner delete" on public.user_fleets
    for delete using (auth.uid() = user_id);

create trigger user_fleets_set_updated_at
    before update on public.user_fleets
    for each row execute function public.set_updated_at();

create index user_fleets_user_idx on public.user_fleets (user_id, created_at desc);
