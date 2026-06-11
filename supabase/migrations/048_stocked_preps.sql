-- ── Stocked preps (Yarımfabrikat): link a prep recipe to its stock ingredient ─
-- A "stocked" prep (a sub-recipe) is tracked as real inventory via a backing
-- produced ingredient: production deducts raw + adds prep stock; sales deduct the
-- prep (not raw). The link makes that explicit and lets the sale-time recipe
-- explosion STOP at the prep instead of recursing to raw (which would
-- double-deduct against the production run). NULL = made-to-order (explode to
-- raw — the prior behaviour, kept for opt-in).
alter table public.recipes
  add column if not exists produced_ingredient_id uuid
    references public.ingredients(id) on delete set null;
create index if not exists recipes_produced_ingredient_idx
  on public.recipes(produced_ingredient_id);
