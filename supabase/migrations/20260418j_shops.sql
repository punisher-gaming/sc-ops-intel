-- Shops + shop inventory from scunpacked.com's shops.json endpoint.
-- scunpacked extracts this from the Star Citizen game files and publishes
-- it at a stable URL; we ingest nightly via scripts/ingest-shops.mjs.
--
-- The shops here are a SEPARATE dataset from trade_locations (which comes
-- from scunpacked-data's trade_locations.json and is commodity-focused).
-- They overlap conceptually but use different UUIDs, so we keep them
-- distinct and let the UI cross-link by name if we ever need it.

create table public.shops (
    id                      text primary key,            -- scunpacked shop reference
    name                    text not null,
    container_path          text,                        -- e.g. "Clothing\\Aparelli\\Aparelli_NewBabbage"
    accepts_stolen_goods    boolean,
    profit_margin           numeric,
    game_version            text,
    source_data             jsonb,
    last_synced_at          timestamptz default now(),
    created_at              timestamptz default now(),
    updated_at              timestamptz default now()
);

alter table public.shops enable row level security;
create policy "shops public read" on public.shops for select using (true);
create trigger shops_set_updated_at
    before update on public.shops
    for each row execute function public.set_updated_at();

create index shops_name_idx on public.shops (name);

-- Inventory line items. Each row is one (shop, item) pair with pricing and
-- stock info. item_reference matches public.weapons.id / public.components.id
-- (and for some kinds, we don't have a row — those are clothing / food / etc.
-- which aren't yet in our catalog).
create table public.shop_inventory (
    id                          bigserial primary key,
    shop_id                     text not null references public.shops(id) on delete cascade,
    item_reference              text not null,           -- weapons.id OR components.id (or unmapped)
    item_class_name             text,                    -- scunpacked filename-derived, e.g. behr_lmg_ballistic_01
    display_name                text,
    item_type                   text,                    -- WeaponGun / Shield / Char_Armor_Helmet / etc.
    item_subtype                text,
    base_price                  numeric,
    max_discount_percentage     numeric,
    max_premium_percentage      numeric,
    inventory_current           numeric,                 -- stock at ingest time (dynamic in-game)
    optimal_inventory           numeric,
    max_inventory               numeric,
    shop_buys_this              boolean not null default false,
    shop_sells_this             boolean not null default false,
    shop_rents_this             boolean not null default false,
    tags                        text[],
    game_version                text,
    last_synced_at              timestamptz default now()
);

alter table public.shop_inventory enable row level security;
create policy "shop_inventory public read" on public.shop_inventory for select using (true);

create index shop_inventory_shop_idx on public.shop_inventory (shop_id);
create index shop_inventory_item_idx on public.shop_inventory (item_reference);
create index shop_inventory_item_type_idx on public.shop_inventory (item_type);
-- Partial indexes for the common "where to buy / sell" queries
create index shop_inventory_sells_idx on public.shop_inventory (item_reference) where shop_sells_this = true;
create index shop_inventory_buys_idx on public.shop_inventory (item_reference) where shop_buys_this = true;
