-- ── STORAGE LOCATIONS + STOCK MOVEMENT (warehouse → kitchen) ───────────────
-- Stock now physically sits in a per-tenant LOCATION (Warehouse, Kitchen, …).
-- Deliveries land in a receiving location; stock is MOVED between locations
-- (a 'transfer' movement + a batch split, migration 030). Sales/waste consume
-- the kitchen (migration 031). tenants.business_type is unrelated.

create table if not exists public.storage_locations (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  name                 text not null,
  is_kitchen           boolean not null default false,
  is_default_receiving boolean not null default false,
  is_frozen            boolean not null default false,
  sort_order           int not null default 0,
  created_at           timestamptz not null default now()
);
create index if not exists storage_locations_tenant_idx
  on public.storage_locations(tenant_id, sort_order);
-- At most one kitchen + one default-receiving location per tenant.
create unique index if not exists storage_locations_one_kitchen
  on public.storage_locations(tenant_id) where is_kitchen;
create unique index if not exists storage_locations_one_default
  on public.storage_locations(tenant_id) where is_default_receiving;

alter table public.storage_locations enable row level security;
drop policy if exists "tenant_all" on public.storage_locations;
create policy "tenant_all" on public.storage_locations
  for all using (tenant_id = public.current_tenant_id() or public.is_platform_admin());

-- Seed Warehouse (default receiving) + Kitchen for every existing tenant.
insert into public.storage_locations (tenant_id, name, is_default_receiving, sort_order)
select t.id, 'Anbar', true, 0 from public.tenants t
where not exists (
  select 1 from public.storage_locations l
  where l.tenant_id = t.id and l.is_default_receiving);

insert into public.storage_locations (tenant_id, name, is_kitchen, sort_order)
select t.id, 'Mətbəx', true, 1 from public.tenants t
where not exists (
  select 1 from public.storage_locations l
  where l.tenant_id = t.id and l.is_kitchen);

-- Each batch now lives in a location. Backfill existing stock into the Kitchen
-- so current sales keep working unchanged; new deliveries default to Warehouse.
alter table public.ingredient_batches
  add column if not exists location_id uuid references public.storage_locations(id);
update public.ingredient_batches b
set location_id = l.id
from public.storage_locations l
where l.tenant_id = b.tenant_id and l.is_kitchen and b.location_id is null;
create index if not exists ingredient_batches_location_idx
  on public.ingredient_batches(tenant_id, location_id, status);

-- Movements can carry a source/destination location (delivery → to, transfer →
-- from+to, sale/waste → from = kitchen).
alter table public.stock_movements
  add column if not exists from_location_id uuid references public.storage_locations(id),
  add column if not exists to_location_id   uuid references public.storage_locations(id);

-- Allow the new 'transfer' movement type (a no-op for deriveStockLevel totals).
alter table public.stock_movements
  drop constraint if exists stock_movements_movement_type_check;
alter table public.stock_movements
  add constraint stock_movements_movement_type_check
  check (movement_type in (
    'delivery','count','waste','adjustment','sale',
    'production_input','production_output','expiry_writeoff','transfer'
  ));

-- A split batch keeps its parent's LOT code in another location, so batch_code
-- is no longer unique — it's a human reference. Keep a plain lookup index.
drop index if exists public.ingredient_batches_code_uniq;
create index if not exists ingredient_batches_code_idx
  on public.ingredient_batches(tenant_id, batch_code) where batch_code is not null;

-- New tenants get the two default locations alongside the waste categories.
create or replace function public.handle_new_tenant()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
  v_slug text;
  v_locale text;
  v_tenant_id uuid;
begin
  v_name := nullif(
    trim(coalesce(new.raw_user_meta_data->>'restaurant_name', '')), '');
  if v_name is null then
    return new;
  end if;
  if exists (select 1 from public.tenant_members where user_id = new.id) then
    return new;
  end if;

  v_locale := coalesce(new.raw_user_meta_data->>'locale', 'az');
  if v_locale not in ('az', 'ru') then
    v_locale := 'az';
  end if;

  v_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then
    v_slug := 'restaurant';
  end if;
  v_slug := v_slug || '-' || substr(replace(new.id::text, '-', ''), 1, 12);

  insert into public.tenants
    (name, slug, currency, locale, status, plan_tier, trial_started_at, trial_ends_at)
  values
    (v_name, v_slug, 'AZN', v_locale, 'trial', 'trial', now(), now() + interval '14 days')
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, new.id, 'owner');

  insert into public.waste_categories (tenant_id, name, name_az, name_ru)
  values
    (v_tenant_id, 'Spoilage',  'Korlanma',       'Порча'),
    (v_tenant_id, 'Over-prep', 'Artıq hazırlıq', 'Переизбыток заготовки'),
    (v_tenant_id, 'Dropped',   'Düşən',          'Уронили'),
    (v_tenant_id, 'Expired',   'Vaxtı keçmiş',   'Просрочено'),
    (v_tenant_id, 'Other',     'Digər',          'Другое');

  insert into public.storage_locations (tenant_id, name, is_default_receiving, sort_order)
  values (v_tenant_id, 'Anbar', true, 0);
  insert into public.storage_locations (tenant_id, name, is_kitchen, sort_order)
  values (v_tenant_id, 'Mətbəx', true, 1);

  perform public.log_activity(
    v_tenant_id, new.id, 'signup', jsonb_build_object('name', v_name));

  insert into public.admin_notifications (type, tenant_id, title, body, dedupe_key)
  values ('new_signup', v_tenant_id, v_name, 'Yeni trial başladı',
          'new_signup:' || v_tenant_id::text)
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;
