-- Weapons + components catalogs from scunpacked items.json (~107 MB, LFS).
-- Ingested locally via scripts/ingest-items.mjs.
--
-- Schema is intentionally minimal — name, manufacturer, type, grade, size
-- with the full per-item payload in source_data. Detail pages drill into
-- source_data for deep stats; list views filter on the extracted columns.

-- Drop the empty Phase 2 stubs (verified empty: nothing was ever ingested
-- into them). Cascades any indexes/triggers/policies attached.
drop table if exists public.weapons cascade;
drop table if exists public.components cascade;

create table public.weapons (
    id              text primary key,            -- scunpacked reference (uuid)
    class_name      text not null,
    name            text not null,
    manufacturer    text,                        -- code like "BEHR", "KLWE"
    type            text not null,               -- WeaponPersonal / WeaponGun / WeaponShip / WeaponDefensive / WeaponAttachment
    subtype         text,                        -- e.g. SniperRifle, Grenade, Pistol
    classification  text,                        -- e.g. "FPS.Weapon.SniperRifle"
    grade           integer,
    size            integer,
    tags            text,
    game_version    text,
    source_data     jsonb,
    last_synced_at  timestamptz default now(),
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

alter table public.weapons enable row level security;
create policy "weapons public read" on public.weapons for select using (true);
create trigger weapons_set_updated_at
    before update on public.weapons
    for each row execute function public.set_updated_at();

create index weapons_type_idx on public.weapons (type);
create index weapons_subtype_idx on public.weapons (subtype);
create index weapons_manufacturer_idx on public.weapons (manufacturer);
create index weapons_name_idx on public.weapons (name);

create table public.components (
    id              text primary key,
    class_name      text not null,
    name            text not null,
    manufacturer    text,
    type            text not null,               -- Cooler / PowerPlant / Shield / QuantumDrive / Turret / etc.
    subtype         text,
    classification  text,
    grade           integer,
    size            integer,
    tags            text,
    game_version    text,
    source_data     jsonb,
    last_synced_at  timestamptz default now(),
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

alter table public.components enable row level security;
create policy "components public read" on public.components for select using (true);
create trigger components_set_updated_at
    before update on public.components
    for each row execute function public.set_updated_at();

create index components_type_idx on public.components (type);
create index components_manufacturer_idx on public.components (manufacturer);
create index components_name_idx on public.components (name);
