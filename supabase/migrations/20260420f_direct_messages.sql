-- In-site direct messaging. Backup contact path when a seller hasn't
-- wired up Discord notifications. Optional `context_listing_id` lets
-- a buyer's first DM reference the auction listing they're interested
-- in so the seller has context.
--
-- RLS: each row is readable only by the two participants. Sender can
-- only insert as themselves. Recipient can mark as read (update). No
-- delete (history is permanent so disputes can be reviewed by mods).

create table if not exists public.direct_messages (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid not null references auth.users(id) on delete cascade,
    recipient_id uuid not null references auth.users(id) on delete cascade,
    body text not null check (length(body) between 1 and 4000),
    context_listing_id uuid references public.auction_listings(id) on delete set null,
    read_at timestamptz,
    created_at timestamptz not null default now(),
    constraint dm_no_self check (sender_id <> recipient_id)
);

create index if not exists direct_messages_recipient_idx
    on public.direct_messages (recipient_id, created_at desc);

create index if not exists direct_messages_sender_idx
    on public.direct_messages (sender_id, created_at desc);

-- Composite that supports thread queries from either side. Pair of
-- least/greatest gives a stable thread key per user pair.
create index if not exists direct_messages_thread_idx
    on public.direct_messages (
        least(sender_id, recipient_id),
        greatest(sender_id, recipient_id),
        created_at desc
    );

alter table public.direct_messages enable row level security;

drop policy if exists dm_read on public.direct_messages;
create policy dm_read on public.direct_messages
    for select to authenticated
    using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists dm_insert on public.direct_messages;
create policy dm_insert on public.direct_messages
    for insert to authenticated
    with check (auth.uid() = sender_id);

drop policy if exists dm_mark_read on public.direct_messages;
create policy dm_mark_read on public.direct_messages
    for update to authenticated
    using (auth.uid() = recipient_id)
    with check (auth.uid() = recipient_id);

-- Joined view with display info so the inbox doesn't need a separate
-- profiles lookup per row.
drop view if exists public.direct_messages_with_users;
create view public.direct_messages_with_users as
    select
        m.*,
        sp.display_name   as sender_name,
        sp.discord_handle as sender_discord,
        sp.avatar_url     as sender_avatar,
        rp.display_name   as recipient_name,
        rp.discord_handle as recipient_discord,
        rp.avatar_url     as recipient_avatar
    from public.direct_messages m
    left join public.profiles sp on sp.id = m.sender_id
    left join public.profiles rp on rp.id = m.recipient_id;

grant select on public.direct_messages_with_users to authenticated;
