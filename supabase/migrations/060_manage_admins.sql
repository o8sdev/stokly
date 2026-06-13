-- 060_manage_admins.sql
-- Manage platform-admin accounts from the console (previously SQL-only).
-- list = any admin; add/remove = 'super' only. SECURITY DEFINER so they can
-- resolve emails from auth.users and bypass platform_admins RLS safely.

create or replace function public.admin_is_super()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.platform_admins
    where user_id = auth.uid() and role = 'super'
  );
$$;

create or replace function public.admin_list_platform_admins()
returns table(user_id uuid, email text, role text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  return query
    select pa.user_id, u.email::text, pa.role, pa.created_at
    from public.platform_admins pa
    left join auth.users u on u.id = pa.user_id
    order by pa.created_at;
end;
$$;

-- Add (or re-role) a platform admin by email. Idempotent. Raises
-- 'user_not_found' when no auth user has that email (they must sign up first).
create or replace function public.admin_add_platform_admin(p_email text, p_role text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid;
  v_role text;
begin
  if not public.admin_is_super() then raise exception 'forbidden'; end if;
  v_role := case when p_role = 'readonly' then 'readonly' else 'super' end;
  select id into v_uid from auth.users
    where lower(email) = lower(btrim(p_email)) limit 1;
  if v_uid is null then raise exception 'user_not_found'; end if;
  insert into public.platform_admins(user_id, role)
    values (v_uid, v_role)
    on conflict (user_id) do update set role = excluded.role;
  return v_uid;
end;
$$;

-- Remove a platform admin. Can't remove yourself, and can't remove the last
-- remaining super admin (otherwise no one could manage admins again).
create or replace function public.admin_remove_platform_admin(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_is_super() then raise exception 'forbidden'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot_remove_self'; end if;
  if (select count(*) from public.platform_admins where role = 'super') <= 1
     and exists (
       select 1 from public.platform_admins
       where user_id = p_user_id and role = 'super'
     ) then
    raise exception 'last_admin';
  end if;
  delete from public.platform_admins where user_id = p_user_id;
end;
$$;

grant execute on function public.admin_is_super() to authenticated;
grant execute on function public.admin_list_platform_admins() to authenticated;
grant execute on function public.admin_add_platform_admin(text, text) to authenticated;
grant execute on function public.admin_remove_platform_admin(uuid) to authenticated;
