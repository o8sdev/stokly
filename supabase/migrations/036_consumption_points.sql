-- ── MULTIPLE CONSUMPTION POINTS — schema foundation (Phase 1) ──────────────
-- Generalizes the single is_kitchen consumption point to many. Additive +
-- behavior-preserving: the consumption RPCs still read is_kitchen until migration
-- 037. We add a curated `kind`, a multi-valued `is_consumption_point`, and exactly
-- one `is_default_consumption` per tenant (the fallback for un-routed recipes and
-- count-only stock), plus a per-recipe consumption_location_id (null = default).

alter table public.storage_locations
  add column if not exists kind text
    check (kind is null or kind in
      ('kitchen','bar','prep','storage','cold_storage','freezer','receiving')),
  add column if not exists is_consumption_point boolean not null default false,
  add column if not exists is_default_consumption boolean not null default false;

-- Backfill kind from existing flags (kind is orthogonal to is_frozen — a kitchen
-- can also be frozen; kitchen/receiving win over the freezer hint).
update public.storage_locations set kind =
  case
    when is_kitchen then 'kitchen'
    when is_default_receiving then 'receiving'
    when is_frozen then 'freezer'
    else 'storage'
  end
where kind is null;

-- The existing single kitchen becomes THE (one) default consumption point.
update public.storage_locations
  set is_consumption_point = true, is_default_consumption = true
where is_kitchen;

-- Replace one-kitchen uniqueness with one-default-consumption. Multiple
-- consumption points are allowed (no unique index on is_consumption_point).
drop index if exists public.storage_locations_one_kitchen;
create unique index if not exists storage_locations_one_default_consumption
  on public.storage_locations(tenant_id) where is_default_consumption;

-- Per-recipe routing: which consumption point a menu item draws from.
-- null = the tenant's default consumption point. ON DELETE SET NULL means
-- deleting a location auto-falls back to the default (no orphaned pointers).
alter table public.recipes
  add column if not exists consumption_location_id uuid
    references public.storage_locations(id) on delete set null;
create index if not exists recipes_consumption_loc_idx
  on public.recipes(consumption_location_id) where consumption_location_id is not null;

-- Centralized fallback used by the routed consumption RPCs (migration 037).
create or replace function public.default_consumption_location(p_tenant uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.storage_locations
  where tenant_id = p_tenant and is_default_consumption
  limit 1
$$;

-- Re-seed new tenants with kind + consumption flags on the two defaults.
-- (Keeps is_kitchen=true on the kitchen until migration 039 drops the column, so
-- the not-yet-swapped readers keep working through phases 1–5.)
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

  insert into public.storage_locations
    (tenant_id, name, kind, is_default_receiving, sort_order)
  values (v_tenant_id, 'Anbar', 'receiving', true, 0);
  insert into public.storage_locations
    (tenant_id, name, kind, is_kitchen, is_consumption_point, is_default_consumption, sort_order)
  values (v_tenant_id, 'Mətbəx', 'kitchen', true, true, true, 1);

  perform public.log_activity(
    v_tenant_id, new.id, 'signup', jsonb_build_object('name', v_name));

  insert into public.admin_notifications (type, tenant_id, title, body, dedupe_key)
  values ('new_signup', v_tenant_id, v_name, 'Yeni trial başladı',
          'new_signup:' || v_tenant_id::text)
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;
