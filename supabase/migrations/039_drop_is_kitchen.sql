-- ── MULTIPLE CONSUMPTION POINTS — drop the vestigial is_kitchen (Phase 6) ──
-- Nothing reads is_kitchen anymore: consumption routes via is_consumption_point /
-- is_default_consumption (migrations 036–037) and the app no longer references it.
-- Redefine handle_new_tenant WITHOUT is_kitchen first (so new signups don't insert
-- a dropped column), then drop the column.

create or replace function public.handle_new_tenant()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
  v_slug text;
  v_locale text;
  v_tenant_id uuid;
begin
  v_name := nullif(trim(coalesce(new.raw_user_meta_data->>'restaurant_name', '')), '');
  if v_name is null then return new; end if;
  if exists (select 1 from public.tenant_members where user_id = new.id) then return new; end if;

  v_locale := coalesce(new.raw_user_meta_data->>'locale', 'az');
  if v_locale not in ('az', 'ru') then v_locale := 'az'; end if;

  v_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'restaurant'; end if;
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
    (tenant_id, name, kind, is_consumption_point, is_default_consumption, sort_order)
  values (v_tenant_id, 'Mətbəx', 'kitchen', true, true, 1);

  perform public.log_activity(v_tenant_id, new.id, 'signup', jsonb_build_object('name', v_name));

  insert into public.admin_notifications (type, tenant_id, title, body, dedupe_key)
  values ('new_signup', v_tenant_id, v_name, 'Yeni trial başladı',
          'new_signup:' || v_tenant_id::text)
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

alter table public.storage_locations drop column if exists is_kitchen;
