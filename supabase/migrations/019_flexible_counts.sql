-- ════════════════════════════════════════════════════════════════════════
-- 019 — Flexible stock-count timing: daily sales, count periods, cycle setting
--
-- Counts close a period (last count → today) and produce a stored, regenerable
-- report. daily_sales lets the period report compute food-cost % and flag days
-- with no sales. count_cycle_days drives dashboard REMINDERS only — it never
-- locks when a count may be performed.
--
-- Tenant-scoped RLS mirrors the ingredients pattern (read = tenant or admin;
-- write/update = tenant + owner/manager, or admin) using the existing helpers
-- current_tenant_id() / current_user_role() / is_platform_admin().
-- ════════════════════════════════════════════════════════════════════════

-- ── DAILY SALES (one total per day) ──────────────────────────────────────
create table public.daily_sales (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  sale_date    date not null,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  note         text,
  recorded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tenant_id, sale_date)
);
create index daily_sales_tenant_date_idx on public.daily_sales(tenant_id, sale_date);

alter table public.daily_sales enable row level security;
create policy "tenant_read" on public.daily_sales for select
  using (tenant_id = public.current_tenant_id() or public.is_platform_admin());
create policy "tenant_write" on public.daily_sales for insert
  with check (
    (tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );
create policy "tenant_update" on public.daily_sales for update
  using (
    (tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );

-- ── COUNT PERIODS (one row per confirmed count, with its report) ─────────
create table public.count_periods (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  period_start        date not null,
  period_end          date not null,
  days_in_period      int not null default 0,
  counted_at          timestamptz not null default now(),
  recorded_by         uuid references auth.users(id) on delete set null,
  missing_sales_dates date[] not null default '{}',
  has_missing_sales   boolean not null default false,
  regeneration_count  int not null default 0,
  report_data         jsonb,
  report_generated_at timestamptz,
  created_at          timestamptz not null default now()
);
create index count_periods_tenant_end_idx on public.count_periods(tenant_id, period_end desc);

alter table public.count_periods enable row level security;
create policy "tenant_read" on public.count_periods for select
  using (tenant_id = public.current_tenant_id() or public.is_platform_admin());
create policy "tenant_write" on public.count_periods for insert
  with check (
    (tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );
create policy "tenant_update" on public.count_periods for update
  using (
    (tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );

-- ── COUNT CYCLE SETTING (reminder cadence only) ──────────────────────────
alter table public.tenants
  add column count_cycle_days int not null default 7;
