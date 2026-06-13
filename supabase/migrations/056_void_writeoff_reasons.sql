-- 056_void_writeoff_reasons.sql
-- Capture a reason on voids and expiry write-offs (anti-fraud / accountability).
-- These are the actions most often used to mask shrinkage, so the reversing
-- movement now stores the operator's typed reason instead of a hardcoded string.
-- The ledger stays append-only — the reason rides the existing reversal insert.
--
-- Adding a defaulted parameter would create an overload (ambiguous with the
-- existing 1-arg calls), so drop the old signatures first, then recreate.

drop function if exists public.void_daily_sales(uuid);
drop function if exists public.write_off_expired(uuid);

create or replace function public.void_daily_sales(p_day_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_status text;
  v_user uuid := auth.uid();
  c record;
  m record;
begin
  select tenant_id, status into v_tenant, v_status
  from public.daily_sales where id = p_day_id for update;
  if v_tenant is null then raise exception 'day not found'; end if;
  if not (v_tenant = public.current_tenant_id() or public.is_platform_admin()) then
    raise exception 'forbidden';
  end if;
  if v_status <> 'confirmed' then raise exception 'not confirmed'; end if;

  -- restore batches, then drop the consumption records
  for c in select batch_id, quantity from public.sale_batch_consumption
           where daily_sales_id = p_day_id loop
    update public.ingredient_batches
      set quantity_remaining = quantity_remaining + c.quantity,
          status = case when status = 'depleted' then 'active' else status end
    where id = c.batch_id;
  end loop;
  delete from public.sale_batch_consumption where daily_sales_id = p_day_id;

  -- reverse each sale movement with an append-only adjustment (+qty), tagging
  -- it with the operator's reason (falls back to the legacy 'sale_void' marker)
  for m in
    select sm.id, sm.ingredient_id, sm.quantity
    from public.stock_movements sm
    where sm.daily_sales_id = p_day_id and sm.movement_type = 'sale'
      and not exists (
        select 1 from public.stock_movements r where r.reverses_movement_id = sm.id)
  loop
    insert into public.stock_movements(
      tenant_id, ingredient_id, movement_type, quantity, is_absolute,
      reverses_movement_id, daily_sales_id, reason, recorded_by)
    values (v_tenant, m.ingredient_id, 'adjustment', m.quantity, false,
            m.id, p_day_id, coalesce(nullif(btrim(p_reason), ''), 'sale_void'), v_user);
  end loop;

  update public.daily_sales
    set status = 'draft', confirmed_at = null, confirmed_by = null,
        updated_at = now()
  where id = p_day_id;
end;
$$;

create or replace function public.write_off_expired(p_tenant uuid, p_reason text default null)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  b record;
  n int := 0;
begin
  if not (p_tenant = public.current_tenant_id() or public.is_platform_admin()) then
    raise exception 'forbidden';
  end if;

  for b in
    select id, ingredient_id, quantity_remaining, location_id
    from public.ingredient_batches
    where tenant_id = p_tenant and status = 'active' and quantity_remaining > 0
      and expiry_date is not null and expiry_date < current_date
    for update
  loop
    insert into public.stock_movements(
      tenant_id, ingredient_id, movement_type, quantity, is_absolute,
      from_location_id, batch_id, reason, recorded_by)
    values (p_tenant, b.ingredient_id, 'expiry_writeoff', b.quantity_remaining, false,
      b.location_id, b.id, coalesce(nullif(btrim(p_reason), ''), 'expired'), v_user);
    update public.ingredient_batches
      set quantity_remaining = 0, status = 'expired' where id = b.id;
    n := n + 1;
  end loop;

  return n;
end;
$$;

grant execute on function public.void_daily_sales(uuid, text) to authenticated;
grant execute on function public.write_off_expired(uuid, text) to authenticated;
