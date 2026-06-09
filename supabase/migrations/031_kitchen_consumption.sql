-- ── KITCHEN-ONLY CONSUMPTION ───────────────────────────────────────────────
-- Sales and waste now draw from KITCHEN stock (batches in the is_kitchen
-- location), FIFO. If the kitchen can't cover it, the operation is REFUSED
-- (move stock to the kitchen first). Exception: ingredients that have never
-- been batch-tracked (stock set only by counts) keep the old behaviour — they
-- are not location-restricted (the no-batch fallback).

-- Replace confirm_daily_sales: kitchen-only FIFO + raise on shortfall.
create or replace function public.confirm_daily_sales(p_day_id uuid, p_usage jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_status text;
  v_user uuid := auth.uid();
  v_kitchen uuid;
  rec record;
  remaining numeric;
  take numeric;
  n_batches int;
  b record;
begin
  select tenant_id, status into v_tenant, v_status
  from public.daily_sales where id = p_day_id for update;
  if v_tenant is null then raise exception 'day not found'; end if;
  if not (v_tenant = public.current_tenant_id() or public.is_platform_admin()) then
    raise exception 'forbidden';
  end if;
  if v_status = 'confirmed' then raise exception 'already confirmed'; end if;

  select id into v_kitchen from public.storage_locations
    where tenant_id = v_tenant and is_kitchen limit 1;

  for rec in
    select * from jsonb_to_recordset(p_usage)
      as x(ingredient_id uuid, quantity numeric, unit_cost numeric)
  loop
    if rec.quantity is null or rec.quantity <= 0 or rec.ingredient_id is null then
      continue;
    end if;

    insert into public.stock_movements(
      tenant_id, ingredient_id, movement_type, quantity, is_absolute,
      unit_cost, daily_sales_id, recorded_by, from_location_id)
    values (v_tenant, rec.ingredient_id, 'sale', rec.quantity, false,
            rec.unit_cost, p_day_id, v_user, v_kitchen);

    select count(*) into n_batches from public.ingredient_batches
      where tenant_id = v_tenant and ingredient_id = rec.ingredient_id;
    if n_batches = 0 then
      continue;  -- no-batch fallback: count-only stock, not location-restricted
    end if;

    remaining := rec.quantity;
    for b in
      select ib.id, ib.quantity_remaining
      from public.ingredient_batches ib
      join public.storage_locations sl on sl.id = ib.location_id
      where ib.tenant_id = v_tenant and ib.ingredient_id = rec.ingredient_id
        and ib.status = 'active' and ib.quantity_remaining > 0 and sl.is_kitchen
      order by ib.received_date asc, ib.id asc
      for update
    loop
      exit when remaining <= 0;
      take := least(remaining, b.quantity_remaining);
      update public.ingredient_batches
        set quantity_remaining = quantity_remaining - take,
            status = case when quantity_remaining - take <= 0 then 'depleted' else status end
      where id = b.id;
      insert into public.sale_batch_consumption(
        tenant_id, daily_sales_id, batch_id, ingredient_id, quantity)
      values (v_tenant, p_day_id, b.id, rec.ingredient_id, take);
      remaining := remaining - take;
    end loop;

    if remaining > 1e-9 then
      raise exception 'kitchen_short:%', rec.ingredient_id;
    end if;
  end loop;

  update public.daily_sales
    set status = 'confirmed', confirmed_at = now(), confirmed_by = v_user,
        updated_at = now()
  where id = p_day_id;
end;
$$;

-- Which batch each waste entry consumed (FIFO), so a reversal restores it.
create table if not exists public.waste_batch_consumption (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  movement_id   uuid not null references public.stock_movements(id) on delete cascade,
  batch_id      uuid not null references public.ingredient_batches(id) on delete restrict,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity      numeric(12,4) not null check (quantity >= 0),
  created_at    timestamptz not null default now()
);
create index if not exists wbc_movement_idx on public.waste_batch_consumption(movement_id);
alter table public.waste_batch_consumption enable row level security;
drop policy if exists "tenant_read" on public.waste_batch_consumption;
create policy "tenant_read" on public.waste_batch_consumption for select
  using (tenant_id = public.current_tenant_id() or public.is_platform_admin());

-- record_waste: waste movement + kitchen FIFO batch consumption (atomic).
create or replace function public.record_waste(
  p_ingredient_id uuid, p_quantity numeric, p_category_id uuid,
  p_unit_cost numeric, p_reason text, p_notes text,
  p_occurred_at timestamptz default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid; v_user uuid := auth.uid(); v_kitchen uuid; v_movement uuid;
  remaining numeric := p_quantity; take numeric; n_batches int; b record;
begin
  select tenant_id into v_tenant from public.ingredients where id = p_ingredient_id;
  if v_tenant is null then raise exception 'ingredient not found'; end if;
  if not (v_tenant = public.current_tenant_id() or public.is_platform_admin()) then
    raise exception 'forbidden';
  end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'invalid quantity'; end if;

  select id into v_kitchen from public.storage_locations
    where tenant_id = v_tenant and is_kitchen limit 1;

  insert into public.stock_movements(
    tenant_id, ingredient_id, movement_type, quantity, is_absolute,
    unit_cost, waste_category_id, reason, notes, recorded_by, from_location_id, created_at)
  values (v_tenant, p_ingredient_id, 'waste', p_quantity, false,
    p_unit_cost, p_category_id, p_reason, p_notes, v_user, v_kitchen,
    coalesce(p_occurred_at, now()))
  returning id into v_movement;

  select count(*) into n_batches from public.ingredient_batches
    where tenant_id = v_tenant and ingredient_id = p_ingredient_id;
  if n_batches = 0 then
    return;  -- no-batch fallback
  end if;

  for b in
    select ib.id, ib.quantity_remaining
    from public.ingredient_batches ib
    join public.storage_locations sl on sl.id = ib.location_id
    where ib.tenant_id = v_tenant and ib.ingredient_id = p_ingredient_id
      and ib.status = 'active' and ib.quantity_remaining > 0 and sl.is_kitchen
    order by ib.received_date asc, ib.id asc
    for update
  loop
    exit when remaining <= 0;
    take := least(remaining, b.quantity_remaining);
    update public.ingredient_batches
      set quantity_remaining = quantity_remaining - take,
          status = case when quantity_remaining - take <= 0 then 'depleted' else status end
    where id = b.id;
    insert into public.waste_batch_consumption(
      tenant_id, movement_id, batch_id, ingredient_id, quantity)
    values (v_tenant, v_movement, b.id, p_ingredient_id, take);
    remaining := remaining - take;
  end loop;

  if remaining > 1e-9 then
    raise exception 'kitchen_short';
  end if;
end;
$$;

-- reverse_waste: restore the consumed kitchen batches + append-only adjustment.
create or replace function public.reverse_waste(p_movement_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid; v_user uuid := auth.uid(); v_ing uuid; v_qty numeric; v_type text;
  c record;
begin
  select tenant_id, ingredient_id, quantity, movement_type
    into v_tenant, v_ing, v_qty, v_type
  from public.stock_movements where id = p_movement_id for update;
  if v_tenant is null then raise exception 'not found'; end if;
  if not (v_tenant = public.current_tenant_id() or public.is_platform_admin()) then
    raise exception 'forbidden';
  end if;
  if v_type <> 'waste' then raise exception 'not_waste'; end if;
  if exists (select 1 from public.stock_movements
             where reverses_movement_id = p_movement_id) then
    raise exception 'already_reversed';
  end if;

  for c in select batch_id, quantity from public.waste_batch_consumption
           where movement_id = p_movement_id loop
    update public.ingredient_batches
      set quantity_remaining = quantity_remaining + c.quantity,
          status = case when status = 'depleted' then 'active' else status end
    where id = c.batch_id;
  end loop;
  delete from public.waste_batch_consumption where movement_id = p_movement_id;

  insert into public.stock_movements(
    tenant_id, ingredient_id, movement_type, quantity, is_absolute,
    reverses_movement_id, reason, recorded_by)
  values (v_tenant, v_ing, 'adjustment', abs(v_qty), false,
    p_movement_id, 'waste_reversal', v_user);
end;
$$;
