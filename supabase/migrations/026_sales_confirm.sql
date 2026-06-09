-- ── CONFIRM / LOCK DAILY SALES → DEDUCT INVENTORY (atomic, append-only) ─────
-- A day's sales are a DRAFT (editable) until confirmed. Confirming deducts
-- inventory (a 'sale' stock_movement per ingredient + FIFO batch consumption)
-- and LOCKS the day. All of it happens inside ONE transaction (the RPC), so it
-- is all-or-nothing. Confirmed days are immutable (enforced by a trigger, not
-- just the UI). A genuine error is fixed by VOID (reverses the movements,
-- restores the batches, re-opens the day to draft) — history is never edited.

alter table public.daily_sales
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'confirmed')),
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid references auth.users(id) on delete set null;

-- Link sale (and sale-reversal) movements back to their day, so void can find
-- and reverse exactly what confirm wrote.
alter table public.stock_movements
  add column if not exists daily_sales_id uuid
    references public.daily_sales(id) on delete set null;

-- Exactly which batch each confirmed day consumed (FIFO), so void restores it.
create table if not exists public.sale_batch_consumption (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  daily_sales_id uuid not null references public.daily_sales(id) on delete cascade,
  batch_id       uuid not null references public.ingredient_batches(id) on delete restrict,
  ingredient_id  uuid not null references public.ingredients(id) on delete restrict,
  quantity       numeric(12,4) not null check (quantity >= 0),
  created_at     timestamptz not null default now()
);
create index if not exists sbc_day_idx on public.sale_batch_consumption(daily_sales_id);
alter table public.sale_batch_consumption enable row level security;
create policy "tenant_read" on public.sale_batch_consumption for select
  using (tenant_id = public.current_tenant_id() or public.is_platform_admin());

-- DB-level immutability: no insert/update/delete of items on a CONFIRMED day.
create or replace function public.guard_confirmed_sale_items()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s text;
begin
  select status into s from public.daily_sales
  where id = coalesce(new.daily_sales_id, old.daily_sales_id);
  if s = 'confirmed' then
    raise exception 'Confirmed sales are locked. Void the day to edit it.';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_guard_confirmed_items on public.daily_sales_items;
create trigger trg_guard_confirmed_items
  before insert or update or delete on public.daily_sales_items
  for each row execute function public.guard_confirmed_sale_items();

-- ── confirm_daily_sales(day, usage) — atomic deduct + lock ─────────────────
-- p_usage = [{ "ingredient_id": uuid, "quantity": numeric, "unit_cost": numeric }]
-- (the recipe explosion is computed in the app and passed in).
create or replace function public.confirm_daily_sales(p_day_id uuid, p_usage jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_status text;
  v_user uuid := auth.uid();
  rec record;
  remaining numeric;
  take numeric;
  b record;
begin
  select tenant_id, status into v_tenant, v_status
  from public.daily_sales where id = p_day_id for update;       -- serialize confirms
  if v_tenant is null then raise exception 'day not found'; end if;
  if not (v_tenant = public.current_tenant_id() or public.is_platform_admin()) then
    raise exception 'forbidden';
  end if;
  if v_status = 'confirmed' then raise exception 'already confirmed'; end if;  -- idempotent

  for rec in
    select * from jsonb_to_recordset(p_usage)
      as x(ingredient_id uuid, quantity numeric, unit_cost numeric)
  loop
    if rec.quantity is null or rec.quantity <= 0 or rec.ingredient_id is null then
      continue;
    end if;

    insert into public.stock_movements(
      tenant_id, ingredient_id, movement_type, quantity, is_absolute,
      unit_cost, daily_sales_id, recorded_by)
    values (v_tenant, rec.ingredient_id, 'sale', rec.quantity, false,
            rec.unit_cost, p_day_id, v_user);

    remaining := rec.quantity;
    for b in
      select id, quantity_remaining from public.ingredient_batches
      where tenant_id = v_tenant and ingredient_id = rec.ingredient_id
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
      insert into public.sale_batch_consumption(
        tenant_id, daily_sales_id, batch_id, ingredient_id, quantity)
      values (v_tenant, p_day_id, b.id, rec.ingredient_id, take);
      remaining := remaining - take;
    end loop;
    -- remaining > 0 ⇒ oversell (fewer batches than sold); the 'sale' movement
    -- still recorded the full quantity, so derived stock reflects the overdraw.
  end loop;

  update public.daily_sales
    set status = 'confirmed', confirmed_at = now(), confirmed_by = v_user,
        updated_at = now()
  where id = p_day_id;
end;
$$;

-- ── void_daily_sales(day) — atomic reverse + re-open to draft ──────────────
create or replace function public.void_daily_sales(p_day_id uuid)
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

  -- reverse each sale movement with an append-only adjustment (+qty)
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
            m.id, p_day_id, 'sale_void', v_user);
  end loop;

  update public.daily_sales
    set status = 'draft', confirmed_at = null, confirmed_by = null,
        updated_at = now()
  where id = p_day_id;
end;
$$;
