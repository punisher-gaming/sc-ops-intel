-- Adds the WTS/WTB listing_type column AND rebuilds the
-- auction_listings_with_seller view to include it. Safe to re-run —
-- the column add is `if not exists`, the view is dropped first.
--
-- Why both in one file: the original 20260420c migration only added the
-- column. The view (created in 20260420a with `select l.*`) had its
-- column list frozen at create-time, so it never picked up the new
-- column even after `or replace`. Folding both ops here means future
-- fresh setups end up consistent with prod.

alter table public.auction_listings
    add column if not exists listing_type text not null default 'wts'
    check (listing_type in ('wts','wtb'));

create index if not exists auction_listings_type_idx
    on public.auction_listings (listing_type, status, created_at desc)
    where status = 'active';

drop view if exists public.auction_listings_with_seller;

create view public.auction_listings_with_seller as
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
