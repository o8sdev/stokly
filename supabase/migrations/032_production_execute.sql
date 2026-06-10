-- ── EXECUTE PRODUCTION RUNS (prep / batch making) ──────────────────────────
-- A production run turns raw ingredients into a produced item: FIFO-consume the
-- raw inputs from the KITCHEN, then create a produced batch in the kitchen whose
-- unit cost is the rolled-up input cost ÷ output qty. Atomic; mirrors the sales
-- engine. Production now moves stock (deriveStockLevel handles the movements).

-- Link production movements back to their run (for void, like daily_sales_id).
alter table public.stock_movements
  add column if not exists production_run_id uuid
    references public.production_runs(id) on delete set null;

create or replace function public.execute_production_run(
  p_output_ingredient_id uuid,
  p_output_quantity numeric,
  p_expiry date,
  p_recipe_id uuid,
  p_notes text,
  p_inputs jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid; v_user uuid := auth.uid(); v_kitchen uuid;
  v_run uuid; v_out_unit text; v_shelf int; v_expiry date;
  v_total_cost numeric := 0; v_total_in_qty numeric := 0; v_out_cost numeric;
  v_out_move uuid; v_yield numeric;
  rec record; remaining numeric; take numeric; n_batches int; b record;
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

  select id into v_kitchen from public.storage_locations
    where tenant_id = v_tenant and is_kitchen limit 1;

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
      v_kitchen, v_run, v_user);

    v_total_in_qty := v_total_in_qty + rec.quantity;

    select count(*) into n_batches from public.ingredient_batches
      where tenant_id = v_tenant and ingredient_id = rec.ingredient_id;
    if n_batches = 0 then
      -- no-batch fallback: value the raw at its current standard cost.
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
      insert into public.production_run_inputs(
        production_run_id, ingredient_id, quantity_used, unit, source_batch_id, unit_cost_at_time)
      values (v_run, rec.ingredient_id, take, b.unit, b.id, b.unit_cost);
      v_total_cost := v_total_cost + take * b.unit_cost;
      remaining := remaining - take;
    end loop;
    if remaining > 1e-9 then
      raise exception 'kitchen_short:%', rec.ingredient_id;
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
    v_out_cost, v_kitchen, v_run, v_user)
  returning id into v_out_move;

  insert into public.ingredient_batches(
    tenant_id, ingredient_id, quantity_received, quantity_remaining, unit, unit_cost,
    expiry_date, status, created_from_movement_id, location_id)
  values (v_tenant, p_output_ingredient_id, p_output_quantity, p_output_quantity, v_out_unit,
    v_out_cost, v_expiry, 'active', v_out_move, v_kitchen);

  v_yield := case when v_total_in_qty > 0 then p_output_quantity / v_total_in_qty else null end;
  if v_yield is not null and v_yield > 9.9999 then v_yield := null; end if;  -- numeric(5,4) guard

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

-- ── void_production_run — undo an intact run ───────────────────────────────
create or replace function public.void_production_run(p_run_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid; v_user uuid := auth.uid(); v_out_ing uuid; v_out_qty numeric;
  v_out_move uuid; v_batch uuid; v_remaining numeric; v_received numeric; v_status text;
  c record;
begin
  select tenant_id, output_ingredient_id, output_quantity
    into v_tenant, v_out_ing, v_out_qty
  from public.production_runs where id = p_run_id;
  if v_tenant is null then raise exception 'run not found'; end if;
  if not (v_tenant = public.current_tenant_id() or public.is_platform_admin()) then
    raise exception 'forbidden';
  end if;

  select id into v_out_move from public.stock_movements
    where production_run_id = p_run_id and movement_type = 'production_output'
      and not exists (select 1 from public.stock_movements r where r.reverses_movement_id = stock_movements.id)
    limit 1;
  if v_out_move is null then raise exception 'already_voided'; end if;

  select id, quantity_remaining, quantity_received, status
    into v_batch, v_remaining, v_received, v_status
  from public.ingredient_batches where created_from_movement_id = v_out_move;
  if v_batch is not null and (v_status <> 'active' or v_remaining <> v_received) then
    raise exception 'output_already_used';
  end if;

  for c in select ingredient_id, quantity_used, source_batch_id
           from public.production_run_inputs where production_run_id = p_run_id loop
    if c.source_batch_id is not null then
      update public.ingredient_batches
        set quantity_remaining = quantity_remaining + c.quantity_used,
            status = case when status = 'depleted' then 'active' else status end
      where id = c.source_batch_id;
    end if;
  end loop;
  insert into public.stock_movements(
    tenant_id, ingredient_id, movement_type, quantity, is_absolute,
    reverses_movement_id, production_run_id, reason, recorded_by)
  select v_tenant, sm.ingredient_id, 'adjustment', sm.quantity, false,
    sm.id, p_run_id, 'production_void', v_user
  from public.stock_movements sm
  where sm.production_run_id = p_run_id and sm.movement_type = 'production_input';

  if v_batch is not null then
    update public.ingredient_batches
      set quantity_remaining = 0, status = 'written_off' where id = v_batch;
  end if;
  insert into public.stock_movements(
    tenant_id, ingredient_id, movement_type, quantity, is_absolute,
    reverses_movement_id, production_run_id, reason, recorded_by)
  values (v_tenant, v_out_ing, 'adjustment', -v_out_qty, false,
    v_out_move, p_run_id, 'production_void', v_user);
end;
$$;
