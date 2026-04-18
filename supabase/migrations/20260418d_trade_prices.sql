-- Phase 3c trade data:
--   commodity_availability  - canonical, from scunpacked (who sells/buys what)
--   commodity_prices        - community-reported aUEC prices per terminal

-- ================================================================
-- AVAILABILITY (canonical)
-- ================================================================

create table public.commodity_availability (
    id                      bigserial primary key,
    commodity_id            text not null references public.commodities(id) on delete cascade,
    trade_location_id       text not null references public.trade_locations(id) on delete cascade,
    kind                    text not null check (kind in ('sold', 'bought')),
    starmap_object_uuid     text,
    tag_name                text,
    game_version            text,
    last_synced_at          timestamptz default now(),
    unique (commodity_id, trade_location_id, kind)
);

alter table public.commodity_availability enable row level security;
create policy "commodity_availability public read" on public.commodity_availability
    for select using (true);

create index commodity_availability_commodity_idx
    on public.commodity_availability (commodity_id, kind);
create index commodity_availability_location_idx
    on public.commodity_availability (trade_location_id, kind);

-- ================================================================
-- PRICES (community-submitted)
-- ================================================================
-- kind:
--   'buy'  = the player BUYS from this terminal (terminal is selling)
--   'sell' = the player SELLS to this terminal (terminal is buying)
--
-- status:
--   'pending'   = just submitted, visible to author
--   'published' = visible to everyone, counted in aggregates
--   'rejected'  = hidden by moderator
--
-- confirmed_count: other users can "confirm" this price is still accurate;
-- we surface confirmed prices higher in the feed.

create type commodity_price_status as enum ('pending', 'published', 'rejected');
create type commodity_price_kind   as enum ('buy', 'sell');

create table public.commodity_prices (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references auth.users(id) on delete cascade,
    commodity_id        text not null references public.commodities(id) on delete cascade,
    trade_location_id   text not null references public.trade_locations(id) on delete cascade,
    kind                commodity_price_kind not null,
    price_auec          numeric not null check (price_auec >= 0),
    stock_scu           numeric,
    note                text,
    game_version        text,
    status              commodity_price_status not null default 'pending',
    confirmed_count     integer not null default 0,
    reported_at         timestamptz not null default now(),
    published_at        timestamptz
);

alter table public.commodity_prices enable row level security;

-- Public read for published prices
create policy "commodity_prices public read published" on public.commodity_prices
    for select using (status = 'published');

-- Authors can read their own reports
create policy "commodity_prices author read own" on public.commodity_prices
    for select using (auth.uid() = user_id);

-- Authed users submit their own reports (forced status=pending by default)
create policy "commodity_prices authed insert own" on public.commodity_prices
    for insert with check (auth.uid() = user_id);

-- Authors can update / delete their own pending rows
create policy "commodity_prices author update own pending" on public.commodity_prices
    for update
    using (auth.uid() = user_id and status = 'pending')
    with check (auth.uid() = user_id and status = 'pending');

create policy "commodity_prices author delete own pending" on public.commodity_prices
    for delete using (auth.uid() = user_id and status <> 'published');

-- Moderators (profiles.is_moderator) can read all + change status
create policy "commodity_prices moderator read all" on public.commodity_prices
    for select using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true)
    );
create policy "commodity_prices moderator update" on public.commodity_prices
    for update
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true));

create index commodity_prices_commodity_idx
    on public.commodity_prices (commodity_id, kind, status);
create index commodity_prices_location_idx
    on public.commodity_prices (trade_location_id, kind, status);
create index commodity_prices_recent_idx
    on public.commodity_prices (reported_at desc) where status = 'published';
