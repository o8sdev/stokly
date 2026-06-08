-- ── MENU-ITEM-LEVEL DAILY SALES ──────────────────────────────────────────
-- Sales were a single money figure per day, which can't tell the system WHAT
-- was sold — so it couldn't relate sales to stock usage. This adds receipt-style
-- line items: which menu item (recipe) sold and how many, per day. Revenue is
-- derived from these (qty × price snapshot); the period report explodes the sold
-- recipes into expected ingredient consumption (theoretical usage) and compares
-- it to the physical count.

-- How the day's revenue figure was set: 'manual' (a typed total, e.g. the
-- quick missing-sales panel) or 'items' (derived from the line items below).
alter table public.daily_sales
  add column if not exists revenue_source text not null default 'manual'
    check (revenue_source in ('manual', 'items'));

create table public.daily_sales_items (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  daily_sales_id uuid not null references public.daily_sales(id) on delete cascade,
  recipe_id      uuid not null references public.recipes(id) on delete restrict,
  quantity       numeric(12,3) not null check (quantity >= 0),
  -- Snapshot of recipes.sale_price at entry time, so changing a menu price
  -- later doesn't rewrite historical revenue.
  unit_price     numeric(12,2) not null default 0 check (unit_price >= 0),
  created_at     timestamptz not null default now(),
  unique (daily_sales_id, recipe_id)
);

create index daily_sales_items_tenant_idx on public.daily_sales_items(tenant_id);
create index daily_sales_items_sales_idx on public.daily_sales_items(daily_sales_id);
create index daily_sales_items_recipe_idx on public.daily_sales_items(recipe_id);

alter table public.daily_sales_items enable row level security;

create policy "tenant_read" on public.daily_sales_items for select
  using (tenant_id = public.current_tenant_id() or public.is_platform_admin());

create policy "tenant_write" on public.daily_sales_items for insert
  with check (
    (tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );

create policy "tenant_update" on public.daily_sales_items for update
  using (
    (tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );

create policy "tenant_delete" on public.daily_sales_items for delete
  using (
    (tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );
