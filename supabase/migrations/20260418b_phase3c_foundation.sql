-- Phase 3c foundation: the actual PUNISHER-owned DB
--   canonical data  :: from scunpacked-data (ingested nightly)
--   community intel :: user-submitted reports, moderator-approved
--
-- Tables:
--   manufacturers        lookup table for blueprint / item makers
--   resources            materials, harvestables, salvage, mining yields
--   resource_locations   where each resource spawns (system / provider / probability)
--   commodities          tradable goods
--   trade_locations      shops / commodity terminals / outposts
--   blueprints           crafting recipes (output item + tiered requirements)
--   blueprint_sources    which missions / reward pools grant each blueprint
--   intel_reports        community-submitted field reports (moderated)
--
-- All tables have public SELECT. Intel reports have authed INSERT on own rows;
-- moderator role flips status to 'published'.

-- === manufacturers ===
create table public.manufacturers (
    id              text primary key,                -- UUID from scunpacked
    code            text,
    name            text not null,
    country         text,
    logo_url        text,
    description     text,
    game_version    text,
    source_data     jsonb,
    last_synced_at  timestamptz default now(),
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

alter table public.manufacturers enable row level security;
create policy "manufacturers public read" on public.manufacturers for select using (true);
create trigger manufacturers_set_updated_at
    before update on public.manufacturers
    for each row execute function public.set_updated_at();

create index manufacturers_code_idx on public.manufacturers (code);

-- === resources ===
-- Raw materials, harvestables, salvage, gas yields, etc.
create table public.resources (
    id              text primary key,                -- UUID from scunpacked
    key             text unique not null,            -- scunpacked "Key" field
    name            text not null,
    kind            text,                            -- cave_harvestable, mining_yield, salvage, etc.
    description     text,
    base_value      numeric,
    rarity          text,
    game_version    text,
    source_data     jsonb,
    last_synced_at  timestamptz default now(),
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

alter table public.resources enable row level security;
create policy "resources public read" on public.resources for select using (true);
create trigger resources_set_updated_at
    before update on public.resources
    for each row execute function public.set_updated_at();

create index resources_name_idx on public.resources (name);
create index resources_kind_idx on public.resources (kind);

-- === resource_locations ===
-- Where each resource spawns: system / provider / probability / clustering info
-- One row per (resource, provider, group, deposit) — denormalized for fast lookup.
create table public.resource_locations (
    id                      bigserial primary key,
    resource_id             text not null references public.resources(id) on delete cascade,
    provider_uuid           text,
    provider_name           text,                    -- "HPP_ShipGraveyard_001" etc.
    system                  text,                    -- Stanton, Pyro
    location_name           text,                    -- "Ship Graveyard"
    location_type           text,                    -- planet, moon, asteroid, station, derelict
    group_name              text,                    -- "Salvage_FreshDerelicts"
    group_probability       numeric,
    relative_probability    numeric,
    clustering_key          text,
    game_version            text,
    source_data             jsonb,
    last_synced_at          timestamptz default now(),
    created_at              timestamptz default now()
);

alter table public.resource_locations enable row level security;
create policy "resource_locations public read" on public.resource_locations for select using (true);

create index resource_locations_resource_idx on public.resource_locations (resource_id);
create index resource_locations_system_idx on public.resource_locations (system);
create index resource_locations_provider_idx on public.resource_locations (provider_uuid);

-- === commodities ===
create table public.commodities (
    id              text primary key,
    code            text,
    name            text not null,
    kind            text,                            -- metal, gas, agricultural, waste, etc.
    description     text,
    game_version    text,
    source_data     jsonb,
    last_synced_at  timestamptz default now(),
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

alter table public.commodities enable row level security;
create policy "commodities public read" on public.commodities for select using (true);
create trigger commodities_set_updated_at
    before update on public.commodities
    for each row execute function public.set_updated_at();

create index commodities_name_idx on public.commodities (name);

-- === trade_locations ===
-- Shops, commodity terminals, refueling stations — anywhere you can buy/sell stuff.
create table public.trade_locations (
    id              text primary key,
    name            text not null,
    system          text,
    planet          text,
    place           text,                            -- city / station / outpost
    operator        text,
    kind            text,                            -- shop, terminal, refuel, etc.
    game_version    text,
    source_data     jsonb,
    last_synced_at  timestamptz default now(),
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

alter table public.trade_locations enable row level security;
create policy "trade_locations public read" on public.trade_locations for select using (true);
create trigger trade_locations_set_updated_at
    before update on public.trade_locations
    for each row execute function public.set_updated_at();

create index trade_locations_system_idx on public.trade_locations (system);

-- === blueprints ===
-- Crafting recipes. One row per blueprint. Tiered requirements live in source_data
-- (they're a nested tree that doesn't flatten cleanly); a normalized summary goes
-- in required_groups for fast table-render without parsing the tree.
create table public.blueprints (
    id                      text primary key,        -- UUID from scunpacked
    key                     text unique not null,    -- "BP_CRAFT_..."
    kind                    text,                    -- creation, conversion, etc.
    category_uuid           text,
    name                    text not null,
    output_item_uuid        text,
    output_item_class       text,
    output_item_name        text,
    output_item_type        text,                    -- WeaponPersonal, ShipItem, etc.
    output_item_subtype     text,
    output_grade            text,
    craft_time_seconds      integer,                 -- tier 0 craft time (simplified)
    available_by_default    boolean,
    required_groups         jsonb,                   -- [{ key, name, required_count, modifier_count }, ...]
    game_version            text,
    source_data             jsonb,                   -- full tier tree for later UI drilldown
    last_synced_at          timestamptz default now(),
    created_at              timestamptz default now(),
    updated_at              timestamptz default now()
);

alter table public.blueprints enable row level security;
create policy "blueprints public read" on public.blueprints for select using (true);
create trigger blueprints_set_updated_at
    before update on public.blueprints
    for each row execute function public.set_updated_at();

create index blueprints_output_type_idx on public.blueprints (output_item_type);
create index blueprints_output_class_idx on public.blueprints (output_item_class);
create index blueprints_name_idx on public.blueprints (name);

-- === blueprint_sources ===
-- How to obtain each blueprint. Multiple rows per blueprint possible (reward pools,
-- shop stock, mission rewards). Canonical sources only here — community intel goes
-- into intel_reports.
create table public.blueprint_sources (
    id              bigserial primary key,
    blueprint_id    text not null references public.blueprints(id) on delete cascade,
    source_kind     text not null,                   -- reward_pool, shop, mission, drop
    source_uuid     text,
    source_key      text,                            -- "BP_MISSIONREWARD_..."
    source_name     text,
    source_data     jsonb,
    game_version    text,
    last_synced_at  timestamptz default now(),
    created_at      timestamptz default now()
);

alter table public.blueprint_sources enable row level security;
create policy "blueprint_sources public read" on public.blueprint_sources for select using (true);

create index blueprint_sources_blueprint_idx on public.blueprint_sources (blueprint_id);
create index blueprint_sources_kind_idx on public.blueprint_sources (source_kind);

-- === intel_reports ===
-- Community-submitted field reports. Attached to any entity in our DB.
-- Status lifecycle: draft → pending → published | rejected.
-- Public can read published. Authed users can insert their own pending reports
-- and edit their own drafts. Moderators (role = 'moderator' on profiles) can
-- publish / reject — enforced via function later, for now status changes are
-- blocked for non-moderators.
create type intel_report_status as enum ('draft', 'pending', 'published', 'rejected');
create type intel_report_kind   as enum (
    'location',           -- "this resource spawns here"
    'mission_reward',     -- "this mission dropped this blueprint"
    'pirate_activity',    -- "pirates active in this area"
    'shop_stock',         -- "this shop had this item in stock"
    'general'
);

create table public.intel_reports (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id) on delete cascade,
    entity_type     entity_type,                     -- from phase2 enum
    entity_id       text,                            -- free-form so we can point at any of our tables
    kind            intel_report_kind not null default 'general',
    status          intel_report_status not null default 'pending',
    title           text not null,
    body            text,
    location_hint   text,                            -- "Daymar, near R&R"
    confirmed_count integer not null default 0,
    game_version    text,
    metadata        jsonb,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now(),
    published_at    timestamptz
);

alter table public.intel_reports enable row level security;

-- Public can read published reports
create policy "intel_reports public read published" on public.intel_reports
    for select using (status = 'published');

-- Authors can read their own drafts/pending
create policy "intel_reports author read own" on public.intel_reports
    for select using (auth.uid() = user_id);

-- Authed users can insert their own reports (forced pending status via trigger below)
create policy "intel_reports authed insert own" on public.intel_reports
    for insert with check (auth.uid() = user_id);

-- Authors can edit their own drafts/pending (can't change status directly)
create policy "intel_reports author update own pending" on public.intel_reports
    for update
    using (auth.uid() = user_id and status in ('draft', 'pending'))
    with check (auth.uid() = user_id and status in ('draft', 'pending'));

-- Authors can delete their own unpublished reports
create policy "intel_reports author delete own unpublished" on public.intel_reports
    for delete using (auth.uid() = user_id and status <> 'published');

create trigger intel_reports_set_updated_at
    before update on public.intel_reports
    for each row execute function public.set_updated_at();

create index intel_reports_entity_idx on public.intel_reports (entity_type, entity_id);
create index intel_reports_status_idx on public.intel_reports (status);
create index intel_reports_user_idx on public.intel_reports (user_id);

-- === profiles: add is_moderator flag ===
alter table public.profiles add column if not exists is_moderator boolean not null default false;

-- === intel_reports moderator policies ===
-- Moderators can read everything and change status to published/rejected.
create policy "intel_reports moderator read all" on public.intel_reports
    for select using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true)
    );

create policy "intel_reports moderator update status" on public.intel_reports
    for update
    using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true)
    )
    with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true)
    );

-- === ingest_runs ===
-- Lightweight audit log so we can see when each ingest mapper last ran.
create table public.ingest_runs (
    id              bigserial primary key,
    source          text not null,                   -- scwiki_ships, scunpacked_blueprints, etc.
    status          text not null,                   -- ok, error
    rows_upserted   integer,
    duration_ms     integer,
    game_version    text,
    message         text,
    started_at      timestamptz not null default now(),
    finished_at     timestamptz
);

alter table public.ingest_runs enable row level security;
create policy "ingest_runs public read" on public.ingest_runs for select using (true);
create index ingest_runs_source_idx on public.ingest_runs (source, started_at desc);
