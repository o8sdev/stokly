-- B3 · Sub-recipe yield %.
--
-- A batch sauce/stock loses volume in prep, so the usable output is less than
-- the raw inputs. yield_percent is the usable fraction (0–1, default 1 = 100%);
-- sub-recipe unit cost becomes batchCost / (serving_size × yield_percent), and
-- theoretical usage scales raw consumption up by the same factor.
--
-- Default 1 keeps every existing recipe unchanged. Existing RLS on public.recipes
-- already governs this column — no policy change needed.
alter table public.recipes
  add column if not exists yield_percent numeric default 1;
