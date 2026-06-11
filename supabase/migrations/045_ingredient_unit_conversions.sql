-- ── #2 Base-unit + per-ingredient pack conversions (B4) ─────────────────────
-- `ingredients.unit` IS the base/stock unit. This table defines how the OTHER
-- units a given ingredient is bought/poured in convert to that base — e.g. for a
-- tequila stored in 'ml': ('bottle', 750), ('case', 4500). The recipe / cost /
-- theoretical-usage math consults these (after the built-in metric kg<->g,
-- l<->ml families), replacing the old silent "assume same unit" fallback. Recipe
-- lines whose unit has no path to the base are now rejected at save time.
create table if not exists public.ingredient_unit_conversions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  ingredient_id   uuid not null references public.ingredients(id) on delete cascade,
  unit            text not null,
  factor_to_base  numeric(16,6) not null check (factor_to_base > 0),
  created_at      timestamptz not null default now(),
  unique (ingredient_id, unit)
);
create index if not exists iuc_ingredient_idx on public.ingredient_unit_conversions(ingredient_id);
create index if not exists iuc_tenant_idx on public.ingredient_unit_conversions(tenant_id);

alter table public.ingredient_unit_conversions enable row level security;
create policy "tenant_read" on public.ingredient_unit_conversions for select
  using (tenant_id = public.current_tenant_id() or public.is_platform_admin());
create policy "tenant_write" on public.ingredient_unit_conversions for insert
  with check ((tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('owner','manager')) or public.is_platform_admin());
create policy "tenant_update" on public.ingredient_unit_conversions for update
  using ((tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('owner','manager')) or public.is_platform_admin());
create policy "tenant_delete" on public.ingredient_unit_conversions for delete
  using ((tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('owner','manager')) or public.is_platform_admin());
