-- Music tracks: moderator-uploaded Star Citizen music that plays on the
-- site. Files live in the 'music' Supabase Storage bucket (see README for
-- bucket creation). This table holds the metadata.

create table public.music_tracks (
    id              uuid primary key default gen_random_uuid(),
    title           text not null,
    artist          text,
    storage_path    text not null,          -- path within the 'music' bucket
    public_url      text not null,          -- publicly served URL
    duration_sec    integer,
    display_order   integer not null default 100,
    enabled         boolean not null default true,
    uploaded_by     uuid references auth.users(id) on delete set null,
    created_at      timestamptz not null default now()
);

alter table public.music_tracks enable row level security;

-- Everyone can see enabled tracks (the player needs this to load)
create policy "music_tracks public read enabled" on public.music_tracks
    for select using (enabled = true);

-- Moderators can read all (including disabled)
create policy "music_tracks moderator read all" on public.music_tracks
    for select using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true)
    );

-- Moderators can insert / update / delete
create policy "music_tracks moderator insert" on public.music_tracks
    for insert with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true)
    );
create policy "music_tracks moderator update" on public.music_tracks
    for update
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true));
create policy "music_tracks moderator delete" on public.music_tracks
    for delete using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true)
    );

create index music_tracks_order_idx on public.music_tracks (display_order) where enabled = true;

-- ============================================================================
-- Single-admin flag: this flag gates moderator-management UI.
-- Only admins (currently just knerfd) can toggle is_moderator on others.
-- ============================================================================

alter table public.profiles add column if not exists is_admin boolean not null default false;
