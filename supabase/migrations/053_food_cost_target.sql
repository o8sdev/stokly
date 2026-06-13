-- ── Food-cost target (limit) ──────────────────────────────────────────────
-- A menu-wide default target food-cost % on the tenant, plus an optional
-- per-recipe override. The dashboard food-cost monitor compares each dish's
-- current food-cost % against its target (recipe override → tenant default) and
-- flags the discrepancy.
alter table public.tenants
  add column if not exists default_food_cost_target numeric not null default 30;

alter table public.recipes
  add column if not exists target_food_cost_percent numeric;
