-- Bump user_fleets ship cap from 100 → 1000.
-- Real hangars from long-time backers easily exceed 100 pledges (the
-- import that motivated this hit 110 matches). 1000 is plenty of
-- headroom while still catching obvious mistakes (no one has 5000 ships).

alter table public.user_fleets
    drop constraint if exists user_fleets_ship_ids_check;

alter table public.user_fleets
    add constraint user_fleets_ship_ids_check
    check (array_length(ship_ids, 1) between 1 and 1000);
