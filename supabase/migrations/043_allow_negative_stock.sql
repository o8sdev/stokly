-- ── #1 Negative Stock Paradox — allow oversell, don't block service ─────────
-- Real service can't stop because a warehouse→kitchen transfer was forgotten:
-- the food was clearly served. So the three consumption RPCs no longer hard-block
-- (`raise 'location_short'`) when FIFO can't cover. Instead they consume what's
-- available and ABSORB the shortfall on the newest batch in that location
-- (driving its quantity_remaining negative while keeping it 'active'). The full
-- consumption movement is still recorded, so deriveStockLevel goes negative — and
-- because the deficit batch stays 'active', the invariant
--   SUM(active quantity_remaining) == deriveStockLevel
-- still holds. The negative level is surfaced as a red flag in the app, telling
-- the owner a transfer/delivery was missed. Count-only ingredients (no batches)
-- keep their existing fallback (movement only). Signatures are unchanged from 037,
-- so create-or-replace replaces in place.

-- confirm_daily_sales --------------------------------------------------------
create or replace function public.confirm_daily_sales(p_day_id uuid, p_usage jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_status text;
  v_user uuid := auth.uid();
  v_default uuid;
  v_loc uuid;
  rec record;
  remaining numeric;
  take numeric;
  n_batches int;
  b record;
  v_deficit_batch uuid;
begin
  select tenant_id, status into v_tenant, v_status
  from public.daily_sales where id = p_day_id for update;
  if v_tenant is null then raise exception 'day not found'; end if;
  if not (v_tenant = public.current_tenant_id() or public.is_platform_admin()) then
    raise exception 'forbidden';
  end if;
  if v_status = 'confirmed' then raise exception 'already confirmed'; end if;

  v_default := public.default_consumption_location(v_tenant);

  for rec in
    select * from jsonb_to_recordset(p_usage)
      as x(ingredient_id uuid, quantity numeric, unit_cost numeric, location_id uuid)
  loop
    if rec.quantity is null or rec.quantity <= 0 or rec.ingredient_id is null then
      continue;
    end if;

    v_loc := coalesce(rec.location_id, v_default);

    insert into public.stock_movements(
      tenant_id, ingredient_id, movement_type, quantity, is_absolute,
      unit_cost, daily_sales_id, recorded_by, from_location_id)
    values (v_tenant, rec.ingredient_id, 'sale', rec.quantity, false,
            rec.unit_cost, p_day_id, v_user, v_loc);

    select count(*) into n_batches from public.ingredient_batches
      where tenant_id = v_tenant and ingredient_id = rec.ingredient_id;
    if n_batches = 0 then
      continue;  -- no-batch fallback: count-only stock, not location-restricted
    end if;

    remaining := rec.quantity;
    for b in
      select ib.id, ib.quantity_remaining
      from public.ingredient_batches ib
      where ib.tenant_id = v_tenant and ib.ingredient_id = rec.ingredient_id
        and ib.status = 'active' and ib.quantity_remaining > 0
        and ib.location_id = v_loc
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

    -- Oversold: absorb the shortfall instead of blocking (see header).
    if remaining > 1e-9 then
      select id into v_deficit_batch from public.ingredient_batches
        where tenant_id = v_tenant and ingredient_id = rec.ingredient_id
          and location_id = v_loc
        order by received_date desc, id desc limit 1;
      if v_deficit_batch is null then
        select id into v_deficit_batch from public.ingredient_batches
          where tenant_id = v_tenant and ingredient_id = rec.ingredient_id
          order by received_date desc, id desc limit 1;
      end if;
      update public.ingredient_batches
        set quantity_remaining = quantity_remaining - remaining, status = 'active'
      where id = v_deficit_batch;
      insert into public.sale_batch_consumption(
        tenant_id, daily_sales_id, batch_id, ingredient_id, quantity)
      values (v_tenant, p_day_id, v_deficit_batch, rec.ingredient_id, remaining);
    end if;
  end loop;

  update public.daily_sales
    set status = 'confirmed', confirmed_at = now(), confirmed_by = v_user,
        updated_at = now()
  where id = p_day_id;
end;
$$;

-- record_waste ---------------------------------------------------------------
create or replace function public.record_waste(
  p_ingredient_id uuid, p_quantity numeric, p_category_id uuid,
  p_unit_cost numeric, p_reason text, p_notes text,
  p_occurred_at timestamptz default null,
  p_location_id uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid; v_user uuid := auth.uid(); v_loc uuid; v_movement uuid;
  remaining numeric := p_quantity; take numeric; n_batches int; b record;
  v_deficit_batch uuid;
begin
  select tenant_id into v_tenant from public.ingredients where id = p_ingredient_id;
  if v_tenant is null then raise exception 'ingredient not found'; end if;
  if not (v_tenant = public.current_tenant_id() or public.is_platform_admin()) then
    raise exception 'forbidden';
  end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'invalid quantity'; end if;

  v_loc := coalesce(p_location_id, public.default_consumption_location(v_tenant));

  insert into public.stock_movements(
    tenant_id, ingredient_id, movement_type, quantity, is_absolute,
    unit_cost, waste_category_id, reason, notes, recorded_by, from_location_id, created_at)
  values (v_tenant, p_ingredient_id, 'waste', p_quantity, false,
    p_unit_cost, p_category_id, p_reason, p_notes, v_user, v_loc,
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
    where ib.tenant_id = v_tenant and ib.ingredient_id = p_ingredient_id
      and ib.status = 'active' and ib.quantity_remaining > 0
      and ib.location_id = v_loc
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

  -- Oversold: absorb the shortfall instead of blocking (see header).
  if remaining > 1e-9 then
    select id into v_deficit_batch from public.ingredient_batches
      where tenant_id = v_tenant and ingredient_id = p_ingredient_id
        and location_id = v_loc
      order by received_date desc, id desc limit 1;
    if v_deficit_batch is null then
      select id into v_deficit_batch from public.ingredient_batches
        where tenant_id = v_tenant and ingredient_id = p_ingredient_id
        order by received_date desc, id desc limit 1;
    end if;
    update public.ingredient_batches
      set quantity_remaining = quantity_remaining - remaining, status = 'active'
    where id = v_deficit_batch;
    insert into public.waste_batch_consumption(
      tenant_id, movement_id, batch_id, ingredient_id, quantity)
    values (v_tenant, v_movement, v_deficit_batch, p_ingredient_id, remaining);
  end if;
end;
$$;

-- execute_production_run -----------------------------------------------------
create or replace function public.execute_production_run(
  p_output_ingredient_id uuid,
  p_output_quantity numeric,
  p_expiry date,
  p_recipe_id uuid,
  p_notes text,
  p_inputs jsonb,
  p_input_location_id uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid; v_user uuid := auth.uid(); v_loc uuid;
  v_run uuid; v_out_unit text; v_shelf int; v_expiry date;
  v_total_cost numeric := 0; v_total_in_qty numeric := 0; v_out_cost numeric;
  v_out_move uuid; v_yield numeric;
  rec record; remaining numeric; take numeric; n_batches int; b record;
  v_deficit_batch uuid; v_def_unit text; v_def_cost numeric;
begin
  select tenant_id, unit, default_shelf_life_days
    into v_tenant, v_out_unit, v_shelf
  from public.ingredients where id = p_output_ingredient_id;
  if v_tenant is null then raise exception 'output not found'; end if;
  if not (v_tenant = public.current_tenant_id() or public.is_platform_admin()) then
    raise exception 'forbidden';
  end if;
  if p_output_quantity is null or p_output_quantity <= 0 then
    raise exception 'invalid output quantity';
  end if;

  v_loc := coalesce(p_input_location_id, public.default_consumption_location(v_tenant));

  insert into public.production_runs(
    tenant_id, output_ingredient_id, output_quantity, output_unit,
    recipe_id, produced_by, notes, produced_at)
  values (v_tenant, p_output_ingredient_id, p_output_quantity, v_out_unit,
    p_recipe_id, v_user, p_notes, now())
  returning id into v_run;

  for rec in
    select * from jsonb_to_recordset(p_inputs) as x(ingredient_id uuid, quantity numeric)
  loop
    if rec.quantity is null or rec.quantity <= 0 or rec.ingredient_id is null then
      continue;
    end if;
    if not exists (select 1 from public.ingredients
                   where id = rec.ingredient_id and tenant_id = v_tenant) then
      raise exception 'input not in tenant';
    end if;

    insert into public.stock_movements(
      tenant_id, ingredient_id, movement_type, quantity, is_absolute,
      from_location_id, production_run_id, recorded_by)
    values (v_tenant, rec.ingredient_id, 'production_input', rec.quantity, false,
      v_loc, v_run, v_user);

    v_total_in_qty := v_total_in_qty + rec.quantity;

    select count(*) into n_batches from public.ingredient_batches
      where tenant_id = v_tenant and ingredient_id = rec.ingredient_id;
    if n_batches = 0 then
      insert into public.production_run_inputs(
        production_run_id, ingredient_id, quantity_used, unit, source_batch_id, unit_cost_at_time)
      select v_run, rec.ingredient_id, rec.quantity, i.unit, null, coalesce(i.cost_per_unit, 0)
      from public.ingredients i where i.id = rec.ingredient_id;
      v_total_cost := v_total_cost + rec.quantity *
        coalesce((select cost_per_unit from public.ingredients where id = rec.ingredient_id), 0);
      continue;
    end if;

    remaining := rec.quantity;
    for b in
      select ib.id, ib.quantity_remaining, ib.unit_cost, ib.unit
      from public.ingredient_batches ib
      where ib.tenant_id = v_tenant and ib.ingredient_id = rec.ingredient_id
        and ib.status = 'active' and ib.quantity_remaining > 0
        and ib.location_id = v_loc
      order by ib.received_date asc, ib.id asc
      for update
    loop
      exit when remaining <= 0;
      take := least(remaining, b.quantity_remaining);
      update public.ingredient_batches
        set quantity_remaining = quantity_remaining - take,
            status = case when quantity_remaining - take <= 0 then 'depleted' else status end
      where id = b.id;
      insert into public.production_run_inputs(
        production_run_id, ingredient_id, quantity_used, unit, source_batch_id, unit_cost_at_time)
      values (v_run, rec.ingredient_id, take, b.unit, b.id, b.unit_cost);
      v_total_cost := v_total_cost + take * b.unit_cost;
      remaining := remaining - take;
    end loop;

    -- Oversold input: absorb the shortfall instead of blocking (see header).
    if remaining > 1e-9 then
      select id, unit, unit_cost into v_deficit_batch, v_def_unit, v_def_cost
        from public.ingredient_batches
        where tenant_id = v_tenant and ingredient_id = rec.ingredient_id
          and location_id = v_loc
        order by received_date desc, id desc limit 1;
      if v_deficit_batch is null then
        select id, unit, unit_cost into v_deficit_batch, v_def_unit, v_def_cost
          from public.ingredient_batches
          where tenant_id = v_tenant and ingredient_id = rec.ingredient_id
          order by received_date desc, id desc limit 1;
      end if;
      update public.ingredient_batches
        set quantity_remaining = quantity_remaining - remaining, status = 'active'
      where id = v_deficit_batch;
      insert into public.production_run_inputs(
        production_run_id, ingredient_id, quantity_used, unit, source_batch_id, unit_cost_at_time)
      values (v_run, rec.ingredient_id, remaining, v_def_unit, v_deficit_batch, v_def_cost);
      v_total_cost := v_total_cost + remaining * coalesce(v_def_cost, 0);
    end if;
  end loop;

  v_out_cost := case when p_output_quantity > 0 then v_total_cost / p_output_quantity else 0 end;
  if p_expiry is not null then
    v_expiry := p_expiry;
  elsif v_shelf is not null and v_shelf > 0 then
    v_expiry := (now()::date + v_shelf);
  else
    v_expiry := null;
  end if;

  insert into public.stock_movements(
    tenant_id, ingredient_id, movement_type, quantity, is_absolute,
    unit_cost, to_location_id, production_run_id, recorded_by)
  values (v_tenant, p_output_ingredient_id, 'production_output', p_output_quantity, false,
    v_out_cost, v_loc, v_run, v_user)
  returning id into v_out_move;

  insert into public.ingredient_batches(
    tenant_id, ingredient_id, quantity_received, quantity_remaining, unit, unit_cost,
    expiry_date, status, created_from_movement_id, location_id)
  values (v_tenant, p_output_ingredient_id, p_output_quantity, p_output_quantity, v_out_unit,
    v_out_cost, v_expiry, 'active', v_out_move, v_loc);

  v_yield := case when v_total_in_qty > 0 then p_output_quantity / v_total_in_qty else null end;
  if v_yield is not null and v_yield > 9.9999 then v_yield := null; end if;

  update public.production_runs
    set output_unit_cost = v_out_cost, output_batch_expiry = v_expiry,
        actual_yield_percent = v_yield
  where id = v_run;

  if v_out_cost > 0 then
    update public.ingredients set cost_per_unit = v_out_cost, is_produced = true
    where id = p_output_ingredient_id and tenant_id = v_tenant;
  end if;

  return v_run;
end;
$$;
