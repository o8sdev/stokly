-- ════════════════════════════════════════════════════════════════════════
-- 011 — Tenant lifecycle columns + entitlement resolvers
--
-- Adds the status/plan/trial/activity columns the admin console needs, then
-- defines the two SECURITY DEFINER entitlement resolvers (now that
-- tenants.plan_tier exists). Resolution rule, single source of truth:
--   1. feature.global_enabled = false        → denied (kill switch)
--   2. tenant_feature_overrides row exists    → use it (explicit grant/deny)
--   3. else plan_features.included for plan   → packaged entitlement
-- ════════════════════════════════════════════════════════════════════════

create type public.tenant_status as enum
  ('active', 'trial', 'suspended', 'churned', 'deleted');

alter table public.tenants
  add column status           public.tenant_status not null default 'trial',
  add column plan_tier        text not null default 'trial' references public.plans(key),
  add column trial_started_at timestamptz,
  add column trial_ends_at    timestamptz,
  add column last_active_at    timestamptz,
  add column suspended_at      timestamptz,
  add column churned_at        timestamptz,
  add column deleted_at        timestamptz;

-- Backfill the one existing real tenant ("DAD House"); editable later in the UI.
update public.tenants
set status = 'active', plan_tier = 'professional'
where status = 'trial';

create index tenants_status_idx      on public.tenants(status);
create index tenants_plan_tier_idx   on public.tenants(plan_tier);
create index tenants_trial_ends_idx  on public.tenants(trial_ends_at) where status = 'trial';
create index tenants_last_active_idx on public.tenants(last_active_at);

-- ── RESOLVERS ─────────────────────────────────────────────────────────────
create or replace function public.tenant_has_feature(p_tenant uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not coalesce(
      (select global_enabled from public.features where key = p_feature), false)
      then false
    when exists (
      select 1 from public.tenant_feature_overrides o
      where o.tenant_id = p_tenant and o.feature_key = p_feature)
      then (select o.enabled from public.tenant_feature_overrides o
            where o.tenant_id = p_tenant and o.feature_key = p_feature)
    else coalesce((
      select pf.included
      from public.tenants t
      join public.plan_features pf
        on pf.plan_key = t.plan_tier and pf.feature_key = p_feature
      where t.id = p_tenant), false)
  end;
$$;
grant execute on function public.tenant_has_feature(uuid, text) to authenticated;

create or replace function public.tenant_entitlements(p_tenant uuid)
returns table (feature_key text, enabled boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select f.key,
    case
      when not f.global_enabled then false
      when o.enabled is not null then o.enabled
      else coalesce(pf.included, false)
    end as enabled
  from public.features f
  left join public.tenant_feature_overrides o
    on o.feature_key = f.key and o.tenant_id = p_tenant
  left join public.tenants t on t.id = p_tenant
  left join public.plan_features pf
    on pf.feature_key = f.key and pf.plan_key = t.plan_tier
  order by f.sort_order;
$$;
grant execute on function public.tenant_entitlements(uuid) to authenticated;
