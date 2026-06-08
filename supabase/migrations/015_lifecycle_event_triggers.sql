-- ════════════════════════════════════════════════════════════════════════
-- 015 — Payment → activity + auto-upgrade + plan_upgraded notification
--
-- On every manual payment: log a 'payment_received' activity event; if the
-- payment is for a higher-ranked plan than the tenant currently holds, upgrade
-- the tenant (active, clear churn) and raise a 'plan_upgraded' notification.
-- Plan downgrades / lateral moves are done explicitly via the admin UI action
-- (audited there), not by a payment.
-- ════════════════════════════════════════════════════════════════════════

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

  if new.plan_key is not null then
    select plan_tier into v_old from public.tenants where id = new.tenant_id;

    if public.plan_rank(new.plan_key) > public.plan_rank(v_old) then
      update public.tenants
      set plan_tier = new.plan_key, status = 'active', churned_at = null
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

drop trigger if exists trg_payment_recorded on public.manual_payments;
create trigger trg_payment_recorded
  after insert on public.manual_payments
  for each row execute function public.on_payment_recorded();
