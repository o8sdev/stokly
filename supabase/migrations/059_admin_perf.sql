-- 059_admin_perf.sql
-- Admin dashboard performance: replace two unbounded "fetch all tenants then
-- count in JS" reads with SQL aggregates, and add the composite indexes the
-- batched health RPC + churn/onboarding scans actually filter on. All read-only.

-- Status counts in one row (active / trial / suspended / churned / live total).
create or replace function public.count_tenants_by_status()
returns table(active int, trial int, suspended int, churned int, total int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  return query
    select
      count(*) filter (where status = 'active')::int,
      count(*) filter (where status = 'trial')::int,
      count(*) filter (where status = 'suspended')::int,
      count(*) filter (where status = 'churned')::int,
      count(*) filter (where status <> 'deleted')::int
    from public.tenants;
end;
$$;

-- Tenant count per plan tier (excludes soft-deleted).
create or replace function public.count_tenants_by_plan()
returns table(plan_tier text, count int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  return query
    select t.plan_tier, count(*)::int
    from public.tenants t
    where t.status <> 'deleted'
    group by t.plan_tier;
end;
$$;

grant execute on function public.count_tenants_by_status() to authenticated;
grant execute on function public.count_tenants_by_plan() to authenticated;

-- admin_tenant_metrics filters stock_movements by (tenant_id, movement_type,
-- created_at); the existing index lacks movement_type.
create index if not exists stock_movements_tenant_type_created_idx
  on public.stock_movements (tenant_id, movement_type, created_at desc);

-- churn-risk / onboarding-stuck / notifications scan tenants by status then
-- order by recency of activity.
create index if not exists tenants_status_last_active_idx
  on public.tenants (status, last_active_at desc);
