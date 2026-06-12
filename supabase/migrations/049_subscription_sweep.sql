-- ── 049: paid-subscription expiry + auto-churn + payment replay guard ───────
-- Closes the lifecycle gaps found in the admin business-logic audit:
--   1. Paid accounts never expired: only trials auto-suspended. Now an ACTIVE
--      tenant on a paid plan whose recorded payment coverage lapsed more than a
--      grace window ago is auto-suspended (tenants with NO payments at all are
--      left alone — those are manual/admin arrangements).
--   2. 'churned' was a ghost state nothing ever set. Now a tenant suspended for
--      N+ days with no payment since suspension flips to churned, so churn
--      metrics mean what they claim. (Any payment still reactivates — the
--      on_payment_recorded trigger from 042 clears both states.)
--   3. Payment replays: the same (tenant, reference) can no longer be inserted
--      twice, so a double-entered transfer can't double-count MRR or re-fire
--      the upgrade trigger.

-- 3) Replay guard — only when a reference is actually provided.
create unique index if not exists uq_manual_payments_tenant_reference
  on public.manual_payments (tenant_id, reference)
  where reference is not null and reference <> '';

-- Churn notifications get their own type (added here, used only at runtime).
alter type public.notification_type add value if not exists 'auto_churned';

-- 1+2) The sweep. Called from the secret-guarded cron route (service role);
-- platform admins may also invoke it manually.
create or replace function public.subscription_sweep(
  p_paid_grace_days int default 7,
  p_churn_after_days int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lapsed uuid[];
  v_churn uuid[];
begin
  if not (
    (select auth.role()) = 'service_role' or public.is_platform_admin()
  ) then
    raise exception 'forbidden';
  end if;

  -- Paid coverage lapsed: active + paid plan + has payments + latest covered
  -- date (period_end, else paid_at's date) older than the grace window.
  select array_agg(t.id) into v_lapsed
  from public.tenants t
  join public.plans p on p.key = t.plan_tier
  join (
    select tenant_id,
           max(coalesce(period_end, paid_at::date)) as covered_until
    from public.manual_payments
    group by tenant_id
  ) pay on pay.tenant_id = t.id
  where t.status = 'active'
    and p.is_trial = false
    and pay.covered_until < (current_date - p_paid_grace_days);

  if v_lapsed is not null then
    update public.tenants
    set status = 'suspended', suspended_at = now()
    where id = any(v_lapsed);

    insert into public.admin_notifications (type, tenant_id, title, body, dedupe_key)
    select 'payment_overdue', t.id, t.name,
           'auto-suspend: paid period lapsed > ' || p_paid_grace_days || 'd',
           'auto_suspended:' || t.id::text || ':' || to_char(now(), 'YYYY-MM-DD')
    from public.tenants t
    where t.id = any(v_lapsed)
    on conflict (dedupe_key) do nothing;
  end if;

  -- Long-suspended with no payment since suspension → churned.
  select array_agg(t.id) into v_churn
  from public.tenants t
  where t.status = 'suspended'
    and t.suspended_at is not null
    and t.suspended_at < now() - make_interval(days => p_churn_after_days)
    and not exists (
      select 1 from public.manual_payments mp
      where mp.tenant_id = t.id and mp.paid_at >= t.suspended_at
    );

  if v_churn is not null then
    update public.tenants
    set status = 'churned', churned_at = now()
    where id = any(v_churn);

    insert into public.admin_notifications (type, tenant_id, title, body, dedupe_key)
    select 'auto_churned', t.id, t.name,
           'suspended > ' || p_churn_after_days || 'd with no payment',
           'auto_churned:' || t.id::text
    from public.tenants t
    where t.id = any(v_churn)
    on conflict (dedupe_key) do nothing;
  end if;

  return jsonb_build_object(
    'suspended_overdue', coalesce(array_length(v_lapsed, 1), 0),
    'churned', coalesce(array_length(v_churn, 1), 0)
  );
end;
$$;

revoke all on function public.subscription_sweep(int, int) from public, anon;
grant execute on function public.subscription_sweep(int, int)
  to authenticated, service_role;
