-- Permanent user-to-user auction house. Sellers list items they own
-- in-game; buyers browse + contact the seller via Discord (handle is
-- already on profiles). Pricing supports aUEC OR any in-game commodity
-- (Gold, Quantanium, Tungsten, etc.) — never real money. This is a
-- ledger of intent, not a payment processor; the trade itself happens
-- in-game.
--
-- Rows are owned by their poster (RLS on user_id). Anyone can SELECT
-- listings that are status='active'. Buyers don't write to this table
-- — they message the seller in Discord and the seller marks SOLD.

create table if not exists public.auction_listings (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id) on delete cascade,

    -- What's being sold. Free-text item name + controlled category list.
    -- Not FK'd into ships/weapons/blueprints because users sell things
    -- we don't catalog (paints, hangar decorations, packages, etc.).
    item_name       text not null check (char_length(item_name) between 2 and 120),
    item_category   text not null
        check (item_category in (
            'ship','vehicle','weapon','armor','component',
            'paint','blueprint','consumable','cargo','other'
        )),

    quantity        int not null default 1 check (quantity between 1 and 9999),

    -- Pricing — currency is either 'aUEC' or any commodity name from the
    -- commodities catalog ('Gold', 'Quantanium', 'Tungsten', etc.). Free
    -- text rather than enum so it's painless to add new commodities.
    price_amount    bigint not null check (price_amount >= 0 and price_amount <= 1000000000000),
    price_currency  text   not null default 'aUEC' check (char_length(price_currency) between 1 and 64),
    price_per_unit  boolean not null default false, -- true = per-unit; false = total

    condition       text,                          -- e.g. "new", "used", "LTI"
    description     text check (description is null or char_length(description) <= 2000),

    status          text not null default 'active'
        check (status in ('active','sold','cancelled','expired')),
    sold_to_handle  text,                          -- optional buyer handle for receipt

    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    expires_at      timestamptz not null default (now() + interval '30 days')
);

-- Indexes for common browse queries
create index if not exists auction_listings_active_idx
    on public.auction_listings (status, created_at desc)
    where status = 'active';
create index if not exists auction_listings_user_idx
    on public.auction_listings (user_id, created_at desc);
create index if not exists auction_listings_category_idx
    on public.auction_listings (item_category, status, created_at desc);
create index if not exists auction_listings_currency_idx
    on public.auction_listings (price_currency, status)
    where status = 'active';

-- ── RLS ──
alter table public.auction_listings enable row level security;

drop policy if exists "auction_listings public read active" on public.auction_listings;
create policy "auction_listings public read active" on public.auction_listings
    for select using (status = 'active');

drop policy if exists "auction_listings owner read" on public.auction_listings;
create policy "auction_listings owner read" on public.auction_listings
    for select using (auth.uid() = user_id);

drop policy if exists "auction_listings owner insert" on public.auction_listings;
create policy "auction_listings owner insert" on public.auction_listings
    for insert with check (auth.uid() = user_id);

drop policy if exists "auction_listings owner update" on public.auction_listings;
create policy "auction_listings owner update" on public.auction_listings
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "auction_listings owner delete" on public.auction_listings;
create policy "auction_listings owner delete" on public.auction_listings
    for delete using (auth.uid() = user_id);

drop trigger if exists auction_listings_set_updated_at on public.auction_listings;
create trigger auction_listings_set_updated_at
    before update on public.auction_listings
    for each row execute function public.set_updated_at();

-- Joined view with seller display info for browse pages
create or replace view public.auction_listings_with_seller as
    select
        l.*,
        coalesce(p.display_name, p.discord_handle) as seller_display_name,
        p.discord_handle                            as seller_discord,
        p.avatar_url                                as seller_avatar,
        p.is_admin                                  as seller_is_admin,
        p.is_moderator                              as seller_is_moderator
    from public.auction_listings l
    left join public.profiles p on p.id = l.user_id;

grant select on public.auction_listings_with_seller to anon, authenticated;
