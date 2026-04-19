-- Auction units + minimum crafting quality.
--
-- CSCU = Crafting SCU (refined materials). Quality is the in-game
-- 1-1000 score; we store a *minimum* (so a buyer can ask for "750 or
-- higher" or a seller can advertise "this batch is at least 820").
--
-- Idempotent: safe to re-run. If a previous attempt added
-- quality_range, it gets dropped here.

alter table public.auction_listings
    add column if not exists unit text not null default 'each'
    check (unit in ('each','scu','cscu'));

alter table public.auction_listings drop column if exists quality_range;

alter table public.auction_listings
    add column if not exists quality_min integer
    check (quality_min is null or (quality_min between 1 and 1000));

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
