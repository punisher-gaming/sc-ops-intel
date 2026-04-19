-- Two-sided auction house: each listing is either WTS (want to sell)
-- or WTB (want to buy). Defaults to WTS so existing rows keep working.
-- View doesn't need rebuilding — it uses SELECT l.* and will surface
-- the new column automatically.

alter table public.auction_listings
    add column if not exists listing_type text not null default 'wts'
    check (listing_type in ('wts','wtb'));

create index if not exists auction_listings_type_idx
    on public.auction_listings (listing_type, status, created_at desc)
    where status = 'active';
