-- ════════════════════════════════════════════════════════════════════════
-- 005 — Self-serve tenant provisioning on signup (removes the service_role key)
--
-- Previously the signup server action used the service_role key to create the
-- tenant + owner membership + default waste categories, because RLS blocks the
-- very first inserts (the user has no tenant_members row yet). This trigger
-- moves that provisioning into the database as a SECURITY DEFINER function that
-- runs as the table owner (bypassing RLS), so the app no longer needs the
-- service_role secret at all.
--
-- It fires only for self-serve owner signups: the signup form passes the
-- restaurant name in the user's metadata (raw_user_meta_data.restaurant_name).
-- Invited users (future) sign up without that metadata and are skipped.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_slug text;
  v_locale text;
  v_tenant_id uuid;
begin
  v_name := nullif(
    trim(coalesce(new.raw_user_meta_data->>'restaurant_name', '')),
    ''
  );

  -- Only provision when a restaurant name was supplied (owner signup) and the
  -- user has not already been provisioned.
  if v_name is null then
    return new;
  end if;
  if exists (
    select 1 from public.tenant_members where user_id = new.id
  ) then
    return new;
  end if;

  v_locale := coalesce(new.raw_user_meta_data->>'locale', 'az');
  if v_locale not in ('az', 'ru') then
    v_locale := 'az';
  end if;

  -- URL-safe, collision-resistant slug: name + a 12-hex slice of the user id.
  v_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then
    v_slug := 'restaurant';
  end if;
  v_slug := v_slug || '-' || substr(replace(new.id::text, '-', ''), 1, 12);

  insert into public.tenants (name, slug, currency, locale)
  values (v_name, v_slug, 'AZN', v_locale)
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

  return new;
end;
$$;

-- Fire after each new auth user is created.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_tenant();
