-- ── EXECUTE EXPIRY WRITE-OFF (FEFO) ────────────────────────────────────────
-- Remove expired stock from inventory: each active batch past its use-by gets an
-- append-only 'expiry_writeoff' movement (−remaining) and is marked 'expired'
-- with 0 remaining. deriveStockLevel now subtracts these, so inventory value and
-- COGS stop being overstated. Returns how many batches were written off.
create or replace function public.write_off_expired(p_tenant uuid)
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
      b.location_id, b.id, 'expired', v_user);
    update public.ingredient_batches
      set quantity_remaining = 0, status = 'expired' where id = b.id;
    n := n + 1;
  end loop;

  return n;
end;
$$;
