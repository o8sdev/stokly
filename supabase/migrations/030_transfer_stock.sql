-- ── MOVE STOCK BETWEEN LOCATIONS (warehouse → kitchen, partial, batch-split) ──
-- Atomically move p_quantity of an ingredient from one location to another by
-- FIFO-splitting the source-location batches: each source batch loses some qty
-- and the destination gains a child batch (same LOT code, cost, supplier_lot)
-- with its OWN expiry — so freezing can extend shelf life via p_expiry_date.
-- Total stock is unchanged (the 'transfer' movement is a no-op for
-- deriveStockLevel), so the SUM(active batches)=derived-stock invariant holds.
create or replace function public.transfer_stock(
  p_ingredient_id uuid,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_quantity numeric,
  p_expiry_date date default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_user uuid := auth.uid();
  remaining numeric := p_quantity;
  take numeric;
  v_expiry date;
  v_dest uuid;
  b record;
begin
  select tenant_id into v_tenant from public.ingredients where id = p_ingredient_id;
  if v_tenant is null then raise exception 'ingredient not found'; end if;
  if not (v_tenant = public.current_tenant_id() or public.is_platform_admin()) then
    raise exception 'forbidden';
  end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'invalid quantity'; end if;
  if p_from_location_id is null or p_to_location_id is null
     or p_from_location_id = p_to_location_id then
    raise exception 'invalid locations';
  end if;
  if not exists (select 1 from public.storage_locations
                 where id = p_from_location_id and tenant_id = v_tenant)
     or not exists (select 1 from public.storage_locations
                    where id = p_to_location_id and tenant_id = v_tenant) then
    raise exception 'invalid location';
  end if;

  for b in
    select id, quantity_remaining, supplier_id, unit, unit_cost, received_date,
           expiry_date, supplier_lot_no, batch_code
    from public.ingredient_batches
    where tenant_id = v_tenant and ingredient_id = p_ingredient_id
      and location_id = p_from_location_id
      and status = 'active' and quantity_remaining > 0
    order by received_date asc, id asc
    for update
  loop
    exit when remaining <= 0;
    take := least(remaining, b.quantity_remaining);

    update public.ingredient_batches
      set quantity_remaining = quantity_remaining - take,
          status = case when quantity_remaining - take <= 0 then 'depleted' else status end
    where id = b.id;

    -- Destination expiry: an explicit override (freezing) else inherit source.
    v_expiry := coalesce(p_expiry_date, b.expiry_date);

    -- Merge into an existing destination batch sharing LOT code + expiry; else
    -- create a child batch at the destination.
    select id into v_dest
    from public.ingredient_batches
    where tenant_id = v_tenant and ingredient_id = p_ingredient_id
      and location_id = p_to_location_id and status = 'active'
      and batch_code is not distinct from b.batch_code
      and expiry_date is not distinct from v_expiry
    limit 1
    for update;

    if v_dest is not null then
      update public.ingredient_batches
        set quantity_remaining = quantity_remaining + take,
            quantity_received = quantity_received + take
      where id = v_dest;
    else
      insert into public.ingredient_batches(
        tenant_id, ingredient_id, supplier_id, quantity_received, quantity_remaining,
        unit, unit_cost, received_date, expiry_date, supplier_lot_no, status,
        batch_code, location_id)
      values (v_tenant, p_ingredient_id, b.supplier_id, take, take,
        b.unit, b.unit_cost, b.received_date, v_expiry, b.supplier_lot_no, 'active',
        b.batch_code, p_to_location_id);
    end if;

    remaining := remaining - take;
  end loop;

  if remaining > 1e-9 then
    raise exception 'insufficient stock at source location';
  end if;

  insert into public.stock_movements(
    tenant_id, ingredient_id, movement_type, quantity, is_absolute,
    from_location_id, to_location_id, recorded_by)
  values (v_tenant, p_ingredient_id, 'transfer', p_quantity, false,
    p_from_location_id, p_to_location_id, v_user);
end;
$$;
