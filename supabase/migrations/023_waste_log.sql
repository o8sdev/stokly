-- ── WASTE LOG ─────────────────────────────────────────────────────────────
-- Waste is already a `waste` stock_movement (so it auto-deducts from stock and
-- is append-only). This makes it a first-class, browsable log:
--   • a proper category FK (the category id was previously crammed into the
--     free-text `reason` column)
--   • reversal linkage so a mistaken waste can be corrected append-only — a
--     reversing `adjustment` movement points back at the original via
--     `reverses_movement_id` (we never edit/delete the original)
-- The cost snapshot uses the existing `unit_cost` column (value = qty×unit_cost).

alter table public.stock_movements
  add column if not exists waste_category_id uuid
    references public.waste_categories(id) on delete set null,
  add column if not exists reverses_movement_id uuid
    references public.stock_movements(id) on delete set null;

-- Backfill: existing waste rows stored the category id inside `reason`.
update public.stock_movements sm
  set waste_category_id = sm.reason::uuid,
      reason = null
where sm.movement_type = 'waste'
  and sm.reason ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1 from public.waste_categories wc where wc.id = sm.reason::uuid
  );

-- Fast browsing of the waste log per tenant by date.
create index if not exists stock_movements_waste_idx
  on public.stock_movements(tenant_id, created_at desc)
  where movement_type = 'waste';
