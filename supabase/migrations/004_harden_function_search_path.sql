-- ════════════════════════════════════════════════════════════════════════
-- 004 — Security hardening for the SECURITY DEFINER helper functions.
-- Pins an empty search_path and fully-qualifies all object references, which
-- prevents search_path hijacking (the standard hardening for SECURITY DEFINER
-- functions, flagged by the Supabase database linter rule 0011). Behaviour is
-- unchanged — these still return the CALLER's own tenant_id / role.
--
-- NOTE: EXECUTE on current_tenant_id() / current_user_role() is intentionally
-- left granted to authenticated. They are called inside RLS policy expressions,
-- and Postgres requires the querying role to hold EXECUTE on functions used in
-- a policy — revoking it would break RLS for signed-in users. They are safe:
-- each only reveals the caller's own membership (derived from auth.uid()).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.current_tenant_id()
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select tenant_id from public.tenant_members
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.tenant_members
  where user_id = auth.uid()
  and tenant_id = public.current_tenant_id()
  limit 1;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
