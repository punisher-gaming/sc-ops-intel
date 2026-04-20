-- Ship hardpoint + component slot definitions, populated from
-- scunpacked-data ship JSONs by scripts/ingest-ship-loadouts.mjs.
--
-- Shape (jsonb):
--   {
--     hardpoints: [{ id, label, size, mount }],
--     components: [{ id, label, size, category }]
--   }
--
-- Lets /meta-loadouts cover every flyable hull, not just the
-- hand-curated 12 in lib/loadouts.ts.

alter table public.ships
    add column if not exists ship_loadout jsonb;

create index if not exists ships_with_loadout_idx
    on public.ships ((ship_loadout is not null))
    where ship_loadout is not null;
