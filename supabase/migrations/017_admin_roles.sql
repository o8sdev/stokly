-- ════════════════════════════════════════════════════════════════════════
-- 017 — Admin roles (super vs read-only)
--
-- platform_admins.role gates destructive actions at the app layer. Existing
-- admins default to 'super'. is_platform_admin() still returns true for both
-- roles (read access); is_super_admin() narrows to 'super'.
-- ════════════════════════════════════════════════════════════════════════

alter table public.platform_admins
  add column role text not null default 'super'
  check (role in ('super', 'readonly'));

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid() and role = 'super'
  );
$$;
grant execute on function public.is_super_admin() to authenticated;
