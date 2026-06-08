-- ════════════════════════════════════════════════════════════════════════
-- 016 — Admin metrics RPCs (one call per page → no N+1)
--
-- admin_tenant_metrics(ids)     → the 10 health-score inputs per tenant
-- admin_onboarding_progress(ids)→ milestone timestamps + login dates per tenant
-- Both are SECURITY DEFINER but self-guard with is_platform_admin() so only
-- system admins get cross-tenant data.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.admin_tenant_metrics(p_ids uuid[])
returns table (
  tenant_id uuid,
  login_days_last_14 int,
  has_recipes boolean,
  stock_count_last_7_days int,
  delivery_logged_last_30_days boolean,
  waste_logged_last_30_days boolean,
  report_viewed_last_30_days boolean,
  recipe_count int,
  ingredient_count int,
  stock_counts_last_28_days int,
  payment_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  with t as (
    select id, status from public.tenants
    where id = any(p_ids) and public.is_platform_admin()
  ),
  logins as (
    select tenant_id, count(distinct (created_at at time zone 'UTC')::date)::int n
    from public.activity_events
    where type = 'login' and created_at >= now() - interval '14 days'
      and tenant_id = any(p_ids)
    group by tenant_id
  ),
  ing as (
    select tenant_id, count(*)::int n from public.ingredients
    where tenant_id = any(p_ids) group by tenant_id
  ),
  rec as (
    select tenant_id, count(*)::int n from public.recipes
    where tenant_id = any(p_ids) group by tenant_id
  ),
  sc7 as (
    select tenant_id, count(*)::int n from public.stock_movements
    where movement_type = 'count' and created_at >= now() - interval '7 days'
      and tenant_id = any(p_ids) group by tenant_id
  ),
  sc28 as (
    select tenant_id, count(*)::int n from public.stock_movements
    where movement_type = 'count' and created_at >= now() - interval '28 days'
      and tenant_id = any(p_ids) group by tenant_id
  ),
  del as (
    select distinct tenant_id from public.stock_movements
    where movement_type = 'delivery' and created_at >= now() - interval '30 days'
      and tenant_id = any(p_ids)
  ),
  wst as (
    select distinct tenant_id from public.stock_movements
    where movement_type = 'waste' and created_at >= now() - interval '30 days'
      and tenant_id = any(p_ids)
  ),
  rep as (
    select distinct tenant_id from public.activity_events
    where type = 'report_viewed' and created_at >= now() - interval '30 days'
      and tenant_id = any(p_ids)
  ),
  pay as (
    select tenant_id, max(coalesce(period_end, paid_at::date)) last_covered
    from public.manual_payments where tenant_id = any(p_ids) group by tenant_id
  )
  select
    t.id,
    coalesce(logins.n, 0),
    coalesce(rec.n, 0) > 0,
    coalesce(sc7.n, 0),
    del.tenant_id is not null,
    wst.tenant_id is not null,
    rep.tenant_id is not null,
    coalesce(rec.n, 0),
    coalesce(ing.n, 0),
    coalesce(sc28.n, 0),
    case
      when t.status = 'suspended' then 'overdue'
      when t.status = 'trial' then 'trial'
      when pay.last_covered is null or pay.last_covered < current_date then 'overdue'
      else 'paid'
    end
  from t
  left join logins on logins.tenant_id = t.id
  left join ing on ing.tenant_id = t.id
  left join rec on rec.tenant_id = t.id
  left join sc7 on sc7.tenant_id = t.id
  left join sc28 on sc28.tenant_id = t.id
  left join del on del.tenant_id = t.id
  left join wst on wst.tenant_id = t.id
  left join rep on rep.tenant_id = t.id
  left join pay on pay.tenant_id = t.id;
$$;
grant execute on function public.admin_tenant_metrics(uuid[]) to authenticated;

create or replace function public.admin_onboarding_progress(p_ids uuid[])
returns table (
  tenant_id uuid,
  created_at timestamptz,
  first_ingredient_at timestamptz,
  tenth_ingredient_at timestamptz,
  first_recipe_at timestamptz,
  first_count_at timestamptz,
  first_delivery_at timestamptz,
  first_waste_at timestamptz,
  first_report_at timestamptz,
  login_dates date[],
  first_payment_at timestamptz,
  status public.tenant_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id, t.created_at,
    ing.first_at, ing.tenth_at,
    rec.first_at, cnt.first_at, del.first_at, wst.first_at, rep.first_at,
    lg.dates, pay.first_at, t.status
  from public.tenants t
  left join lateral (
    select min(created_at) first_at,
           min(created_at) filter (where rn = 10) tenth_at
    from (
      select created_at, row_number() over (order by created_at) rn
      from public.ingredients where tenant_id = t.id
    ) x
  ) ing on true
  left join lateral (
    select min(created_at) first_at from public.recipes where tenant_id = t.id
  ) rec on true
  left join lateral (
    select min(created_at) first_at from public.stock_movements
    where tenant_id = t.id and movement_type = 'count'
  ) cnt on true
  left join lateral (
    select min(created_at) first_at from public.stock_movements
    where tenant_id = t.id and movement_type = 'delivery'
  ) del on true
  left join lateral (
    select min(created_at) first_at from public.stock_movements
    where tenant_id = t.id and movement_type = 'waste'
  ) wst on true
  left join lateral (
    select min(created_at) first_at from public.activity_events
    where tenant_id = t.id and type = 'report_viewed'
  ) rep on true
  left join lateral (
    select array_agg(distinct (created_at at time zone 'UTC')::date) dates
    from public.activity_events where tenant_id = t.id and type = 'login'
  ) lg on true
  left join lateral (
    select min(paid_at) first_at from public.manual_payments where tenant_id = t.id
  ) pay on true
  where t.id = any(p_ids) and public.is_platform_admin();
$$;
grant execute on function public.admin_onboarding_progress(uuid[]) to authenticated;
