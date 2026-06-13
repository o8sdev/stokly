-- ── PER-LOCATION stock counts ─────────────────────────────────────────────
-- Counts were global: an is_absolute 'count' movement reset the whole
-- ingredient's level and never touched batches, so the per-location view
-- (batch-derived) couldn't reflect a count and "kitchen 3 / bar 2" was
-- inexpressible. record_stock_count counts ONE station at a time and reconciles
-- that station's batches to the counted figure, recording a DELTA 'count'
-- movement (from_location_id = the station). The global reducer adds the delta
-- (case 'count') so Σ active-batch remaining == derived level holds per station
-- AND overall; counting one station never wipes another.
--
-- Each line: { ingredient_id, location_id, counted_qty, occurred_at }.
create or replace function public.record_stock_count(p_lines jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_user uuid := auth.uid();
  v_default uuid;
  rec record;
  v_loc uuid;
  v_occurred timestamptz;
  v_unit text;
  v_cost numeric;
  v_shelf int;
  v_on_hand numeric;
  v_delta numeric;
  v_remaining numeric;
  v_take numeric;
  v_expiry date;
  v_move uuid;
  b record;
begin
  if v_tenant is null then raise exception 'forbidden'; end if;
  v_default := public.default_consumption_location(v_tenant);

  for rec in
    select * from jsonb_to_recordset(p_lines)
      as x(ingredient_id uuid, location_id uuid, counted_qty numeric, occurred_at timestamptz)
  loop
    if rec.ingredient_id is null or rec.counted_qty is null or rec.counted_qty < 0 then
      continue;
    end if;

    select unit, coalesce(cost_per_unit, 0), default_shelf_life_days
      into v_unit, v_cost, v_shelf
    from public.ingredients
    where id = rec.ingredient_id and tenant_id = v_tenant;
    if not found then raise exception 'ingredient not in tenant'; end if;

    v_loc := coalesce(rec.location_id, v_default);
    v_occurred := coalesce(rec.occurred_at, now());

    select coalesce(sum(quantity_remaining), 0) into v_on_hand
    from public.ingredient_batches
    where tenant_id = v_tenant and ingredient_id = rec.ingredient_id
      and status = 'active' and location_id = v_loc;

    v_delta := rec.counted_qty - v_on_hand;

    -- Append the count movement (a per-station delta; from_location_id stamps
    -- the station). is_absolute is false so the global reducer ADDS the delta.
    insert into public.stock_movements(
      tenant_id, ingredient_id, movement_type, quantity, is_absolute,
      from_location_id, recorded_by, created_at)
    values (v_tenant, rec.ingredient_id, 'count', v_delta, false,
      v_loc, v_user, v_occurred)
    returning id into v_move;

    if v_delta > 1e-9 then
      -- Surplus: add a costed batch at the counted station.
      if v_shelf is not null and v_shelf > 0 then
        v_expiry := (v_occurred::date + v_shelf);
      else
        v_expiry := null;
      end if;
      insert into public.ingredient_batches(
        tenant_id, ingredient_id, quantity_received, quantity_remaining, unit,
        unit_cost, expiry_date, status, created_from_movement_id, location_id)
      values (v_tenant, rec.ingredient_id, v_delta, v_delta, v_unit,
        v_cost, v_expiry, 'active', v_move, v_loc);
    elsif v_delta < -1e-9 then
      -- Shortfall: FIFO-reduce the station's active batches down to the count.
      v_remaining := -v_delta;
      for b in
        select id, quantity_remaining
        from public.ingredient_batches
        where tenant_id = v_tenant and ingredient_id = rec.ingredient_id
          and status = 'active' and quantity_remaining > 0 and location_id = v_loc
        order by received_date asc, id asc
        for update
      loop
        exit when v_remaining <= 0;
        v_take := least(v_remaining, b.quantity_remaining);
        update public.ingredient_batches
          set quantity_remaining = quantity_remaining - v_take,
              status = case when quantity_remaining - v_take <= 0 then 'depleted' else status end
        where id = b.id;
        v_remaining := v_remaining - v_take;
      end loop;
    end if;
  end loop;
end;
$$;
