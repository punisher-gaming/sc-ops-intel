-- PUNISHER GAMING :: SC OPS INTEL :: Phase 2 initial schema
-- Public catalog (anon SELECT via RLS, writes via service_role from ingest worker)
-- User-gated: profiles, notes — owner-only via RLS

-- ================================================================
-- ENUMS
-- ================================================================

create type blueprint_source_type as enum ('mission', 'shop', 'drop', 'reward', 'other');
create type resource_source_type  as enum ('mining', 'harvesting', 'mission_reward', 'shop', 'drop', 'refining', 'other');
create type entity_type            as enum ('ship', 'weapon', 'component', 'commodity', 'blueprint', 'recipe', 'resource', 'general');

-- ================================================================
-- HELPER: updated_at touch trigger
-- ================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ================================================================
-- CATALOG TABLES (public read)
-- ================================================================

create table public.ships (
  id              text primary key,
  game_version    text not null,
  name            text not null,
  manufacturer    text,
  role            text,
  size_class      text,
  hull_hp         integer,
  shields_hp      integer,
  scm_speed       integer,
  max_speed       integer,
  cargo_scu       integer,
  crew_min        integer,
  crew_max        integer,
  last_synced_at  timestamptz not null default now(),
  source_data     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index ships_name_idx         on public.ships (name);
create index ships_manufacturer_idx on public.ships (manufacturer);
create index ships_role_idx         on public.ships (role);
create index ships_version_idx      on public.ships (game_version);
create trigger ships_updated before update on public.ships for each row execute function public.set_updated_at();

create table public.weapons (
  id              text primary key,
  game_version    text not null,
  name            text not null,
  manufacturer    text,
  weapon_type     text,
  mount_type      text,
  size_class      text,
  damage          numeric,
  fire_rate       numeric,
  range_m         numeric,
  ammo            integer,
  last_synced_at  timestamptz not null default now(),
  source_data     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index weapons_name_idx on public.weapons (name);
create index weapons_type_idx on public.weapons (weapon_type);
create trigger weapons_updated before update on public.weapons for each row execute function public.set_updated_at();

create table public.components (
  id              text primary key,
  game_version    text not null,
  name            text not null,
  manufacturer    text,
  component_type  text,
  grade           text,
  size_class      text,
  last_synced_at  timestamptz not null default now(),
  source_data     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index components_type_idx on public.components (component_type);
create trigger components_updated before update on public.components for each row execute function public.set_updated_at();

create table public.commodities (
  id              text primary key,
  game_version    text not null,
  name            text not null,
  category        text,
  base_price      numeric,
  last_synced_at  timestamptz not null default now(),
  source_data     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index commodities_category_idx on public.commodities (category);
create trigger commodities_updated before update on public.commodities for each row execute function public.set_updated_at();

-- ================================================================
-- BLUEPRINTS + where to get them
-- ================================================================

create table public.blueprints (
  id                text primary key,
  game_version      text not null,
  name              text not null,
  blueprint_type    text,
  rarity            text,
  output_item_id    text,
  output_item_type  text,
  description       text,
  last_synced_at    timestamptz not null default now(),
  source_data       jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index blueprints_type_idx   on public.blueprints (blueprint_type);
create index blueprints_rarity_idx on public.blueprints (rarity);
create index blueprints_output_idx on public.blueprints (output_item_type, output_item_id);
create trigger blueprints_updated before update on public.blueprints for each row execute function public.set_updated_at();

create table public.blueprint_sources (
  id             bigserial primary key,
  blueprint_id   text not null references public.blueprints(id) on delete cascade,
  source_type    blueprint_source_type not null,
  location       text,
  mission_name   text,
  npc_faction    text,
  notes          text,
  created_at     timestamptz not null default now()
);
create index blueprint_sources_bp_idx      on public.blueprint_sources (blueprint_id);
create index blueprint_sources_type_idx    on public.blueprint_sources (source_type);
create index blueprint_sources_mission_idx on public.blueprint_sources (mission_name);

-- ================================================================
-- RESOURCES + where to find them
-- ================================================================

create table public.resources (
  id              text primary key,
  game_version    text not null,
  name            text not null,
  resource_type   text,
  rarity          text,
  description     text,
  last_synced_at  timestamptz not null default now(),
  source_data     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index resources_type_idx on public.resources (resource_type);
create trigger resources_updated before update on public.resources for each row execute function public.set_updated_at();

create table public.resource_sources (
  id           bigserial primary key,
  resource_id  text not null references public.resources(id) on delete cascade,
  source_type  resource_source_type not null,
  location     text,
  method       text,
  notes        text,
  created_at   timestamptz not null default now()
);
create index resource_sources_res_idx  on public.resource_sources (resource_id);
create index resource_sources_type_idx on public.resource_sources (source_type);

-- ================================================================
-- CRAFTING: recipes + ingredients
-- ================================================================

create table public.crafting_recipes (
  id                 bigserial primary key,
  blueprint_id       text not null references public.blueprints(id) on delete cascade,
  fabricator_type    text,
  output_quantity    integer not null default 1,
  craft_time_seconds integer,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index crafting_recipes_bp_idx on public.crafting_recipes (blueprint_id);
create trigger crafting_recipes_updated before update on public.crafting_recipes for each row execute function public.set_updated_at();

create table public.crafting_ingredients (
  id          bigserial primary key,
  recipe_id   bigint not null references public.crafting_recipes(id) on delete cascade,
  resource_id text not null references public.resources(id) on delete cascade,
  quantity    integer not null check (quantity > 0),
  created_at  timestamptz not null default now()
);
create index crafting_ingredients_recipe_idx   on public.crafting_ingredients (recipe_id);
create index crafting_ingredients_resource_idx on public.crafting_ingredients (resource_id);

-- ================================================================
-- USER-GATED: profiles, notes
-- ================================================================

create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text,
  avatar_url       text,
  rsi_handle       text,
  discord_handle   text,
  bio              text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index profiles_rsi_handle_idx on public.profiles (rsi_handle);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.notes (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  entity_type  entity_type not null default 'general',
  entity_id    text,
  title        text,
  body         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index notes_user_idx         on public.notes (user_id);
create index notes_user_entity_idx  on public.notes (user_id, entity_type, entity_id);
create trigger notes_updated before update on public.notes for each row execute function public.set_updated_at();

-- ================================================================
-- RSI profile cache (public, TTL'd by server)
-- ================================================================

create table public.rsi_profile_cache (
  handle        text primary key,
  profile_data  jsonb not null,
  fetched_at    timestamptz not null default now()
);

-- ================================================================
-- RLS
-- ================================================================

alter table public.ships                enable row level security;
alter table public.weapons              enable row level security;
alter table public.components           enable row level security;
alter table public.commodities          enable row level security;
alter table public.blueprints           enable row level security;
alter table public.blueprint_sources    enable row level security;
alter table public.resources            enable row level security;
alter table public.resource_sources     enable row level security;
alter table public.crafting_recipes     enable row level security;
alter table public.crafting_ingredients enable row level security;
alter table public.profiles             enable row level security;
alter table public.notes                enable row level security;
alter table public.rsi_profile_cache    enable row level security;

-- Catalog: public SELECT (writes happen via service_role, which bypasses RLS)
create policy "ships_public_read"                on public.ships                for select to anon, authenticated using (true);
create policy "weapons_public_read"              on public.weapons              for select to anon, authenticated using (true);
create policy "components_public_read"           on public.components           for select to anon, authenticated using (true);
create policy "commodities_public_read"          on public.commodities          for select to anon, authenticated using (true);
create policy "blueprints_public_read"           on public.blueprints           for select to anon, authenticated using (true);
create policy "blueprint_sources_public_read"    on public.blueprint_sources    for select to anon, authenticated using (true);
create policy "resources_public_read"            on public.resources            for select to anon, authenticated using (true);
create policy "resource_sources_public_read"     on public.resource_sources     for select to anon, authenticated using (true);
create policy "crafting_recipes_public_read"     on public.crafting_recipes     for select to anon, authenticated using (true);
create policy "crafting_ingredients_public_read" on public.crafting_ingredients for select to anon, authenticated using (true);
create policy "rsi_cache_public_read"            on public.rsi_profile_cache    for select to anon, authenticated using (true);

-- Profiles: readable by anyone (so we can show a note author's display name later);
-- only the owner can update
create policy "profiles_public_read"    on public.profiles for select to anon, authenticated using (true);
create policy "profiles_owner_update"   on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_owner_insert"   on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Notes: owner-only, full CRUD
create policy "notes_owner_read"    on public.notes for select to authenticated using (auth.uid() = user_id);
create policy "notes_owner_insert"  on public.notes for insert to authenticated with check (auth.uid() = user_id);
create policy "notes_owner_update"  on public.notes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_owner_delete"  on public.notes for delete to authenticated using (auth.uid() = user_id);
