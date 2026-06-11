-- ── Suspend lifecycle: reactivate a suspended/churned tenant on any payment ──
-- Trial expiry now SUSPENDS a tenant (blocked from the app until they pay). That
-- suspension is enforced app-side: lazily in requireTenant on the next load, and
-- in bulk by the /api/admin/cron sweep — pg_cron is unavailable, so this runs
-- app-side like the other time-based admin jobs (see app/api/admin/cron/route.ts).
--
-- The only DB-side piece is reactivation: recording a payment is the one-step
-- "let them back in after they pay". This re-creates on_payment_recorded (orig.
-- migration 015) so that, in addition to the existing higher-rank upgrade, ANY
-- recorded payment clears a suspension/churn.
--
-- Signature is unchanged (no args, returns trigger) so `create or replace`
-- replaces the body in place; the trg_payment_recorded trigger keeps pointing at
-- it — no need to recreate the trigger.
create or replace function public.on_payment_recorded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  perform public.log_activity(
    new.tenant_id, new.created_by, 'payment_received',
    jsonb_build_object('amount', new.amount, 'plan_key', new.plan_key, 'payment_id', new.id));

  -- Any payment reactivates a suspended/churned account — covers a `normal`
  -- tenant suspended for non-payment AND a trial that auto-suspended on expiry.
  -- Runs BEFORE the upgrade branch (which also flips status to 'active') so this
  -- guard still sees the pre-payment status.
  update public.tenants
  set status = 'active', suspended_at = null, churned_at = null
  where id = new.tenant_id and status in ('suspended', 'churned');

  if new.plan_key is not null then
    select plan_tier into v_old from public.tenants where id = new.tenant_id;

    if public.plan_rank(new.plan_key) > public.plan_rank(v_old) then
      update public.tenants
      set plan_tier = new.plan_key, status = 'active',
          churned_at = null, suspended_at = null
      where id = new.tenant_id;

      insert into public.admin_notifications (type, tenant_id, title, body, dedupe_key)
      select 'plan_upgraded', new.tenant_id, t.name,
             coalesce(v_old, '?') || ' → ' || new.plan_key,
             'plan_upgraded:' || new.tenant_id::text || ':' || new.plan_key
      from public.tenants t where t.id = new.tenant_id
      on conflict (dedupe_key) do nothing;
    end if;
  end if;

  return new;
end;
$$;
