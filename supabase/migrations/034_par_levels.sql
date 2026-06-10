-- B1 · Par levels (build-to-par planning).
--
-- `low_stock_threshold` stays the *reorder trigger* (when to buy); `par_level` is
-- the *target* we top stock back up to (how much to have on hand). The suggested
-- order in the shopping list is max(0, par_level - on_hand).
--
-- Nullable: an ingredient with no par simply produces no build-to-par suggestion
-- (it can still surface in the shopping list via its reorder threshold). Existing
-- RLS on public.ingredients already governs this column — no policy change needed.
alter table public.ingredients
  add column if not exists par_level numeric;
