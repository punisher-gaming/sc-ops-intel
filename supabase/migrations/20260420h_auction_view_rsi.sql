-- Surface seller's RSI in-game handle in the auction listings view.
-- The AH is fundamentally about meeting up in-game, so the RSI handle
-- is the most useful identifier — it's what other players type into
-- the mobiGlas to find you. Discord is secondary.

drop view if exists public.auction_listings_with_seller;

create view public.auction_listings_with_seller as
    select
        l.*,
        coalesce(p.display_name, p.discord_handle) as seller_display_name,
        p.discord_handle                            as seller_discord,
        p.rsi_handle                                as seller_rsi_handle,
        p.avatar_url                                as seller_avatar,
        p.is_admin                                  as seller_is_admin,
        p.is_moderator                              as seller_is_moderator
    from public.auction_listings l
    left join public.profiles p on p.id = l.user_id;

grant select on public.auction_listings_with_seller to anon, authenticated;
