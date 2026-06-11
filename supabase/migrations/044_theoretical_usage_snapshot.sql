-- ── #4 Historical Recipe Trap — snapshot theoretical usage at confirm ───────
-- Period reports recomputed theoretical usage from the LIVE recipe, so editing a
-- recipe (e.g. 150g → 120g) retroactively rewrote past reports. Each confirmed day
-- now snapshots its exploded per-ingredient theoretical usage — the very numbers
-- the deduction used — and the period report sums the snapshot for fully-covered
-- windows, freezing history. Windows with pre-feature confirmed days (no snapshot)
-- fall back to the live recompute, so nothing regresses during the transition.
--
-- Actual COGS was already immutable (stock_movements.unit_cost + batch consumption
-- captured at confirm); this closes the THEORETICAL side.
create table if not exists public.daily_sales_theoretical_usage (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  daily_sales_id uuid not null references public.daily_sales(id) on delete cascade,
  ingredient_id  uuid not null references public.ingredients(id) on delete cascade,
  quantity       numeric(14,4) not null,
  unit_cost      numeric(12,4) not null default 0,
  created_at     timestamptz not null default now(),
  unique (daily_sales_id, ingredient_id)
);
create index if not exists dstu_day_idx on public.daily_sales_theoretical_usage(daily_sales_id);
create index if not exists dstu_tenant_idx on public.daily_sales_theoretical_usage(tenant_id);

alter table public.daily_sales_theoretical_usage enable row level security;

-- Read by tenant; written/cleared by owner/manager during (re)confirm + void.
-- No confirmed-day guard: the snapshot is written WHILE the day flips to confirmed.
create policy "tenant_read" on public.daily_sales_theoretical_usage for select
  using (tenant_id = public.current_tenant_id() or public.is_platform_admin());
create policy "tenant_write" on public.daily_sales_theoretical_usage for insert
  with check (
    (tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );
create policy "tenant_delete" on public.daily_sales_theoretical_usage for delete
  using (
    (tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );
