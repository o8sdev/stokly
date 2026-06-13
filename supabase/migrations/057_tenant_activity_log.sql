-- 057_tenant_activity_log.sql
-- A tenant-facing audit trail: who did what, when. The existing activity_events
-- table + log_activity RPC are platform-admin-only (RLS is_platform_admin), so
-- tenants can't read them — hence a dedicated, manager-readable table here.
--
-- There is no tenant-side user_id -> email resolver (tenant_members stores only
-- id/role; only the service-role admin client can read auth.users). So a
-- SECURITY DEFINER writer denormalizes auth.users.email at write time (the same
-- pattern as admin_audit_log.actor_email), and a definer reader resolves
-- historical recorded_by ids -> emails for the journals — scoped to the caller's
-- own tenant so no cross-tenant emails leak.

create table if not exists public.tenant_activity_log (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  actor_id    uuid references auth.users(id) on delete set null,
  actor_email text,
  action      text not null,           -- 'entity.verb', e.g. 'ingredient.archive'
  entity_type text,                     -- 'ingredient' | 'recipe' | 'sales' | ...
  entity_id   uuid,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists tenant_activity_tenant_idx
  on public.tenant_activity_log (tenant_id, created_at desc);

alter table public.tenant_activity_log enable row level security;

-- Managers/owners read their tenant's log; platform admins read all. No INSERT
-- policy: rows are only ever written by the SECURITY DEFINER function below.
drop policy if exists "tenant_read_mgr" on public.tenant_activity_log;
create policy "tenant_read_mgr" on public.tenant_activity_log
  for select using (
    (tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );

-- Append one audit row for the caller's tenant, stamping the actor's email.
create or replace function public.log_tenant_activity(
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_meta jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_tenant is null then return; end if;  -- no tenant context, skip silently
  select email into v_email from auth.users where id = v_uid;
  insert into public.tenant_activity_log(
    tenant_id, actor_id, actor_email, action, entity_type, entity_id, meta)
  values (v_tenant, v_uid, v_email, p_action, p_entity_type, p_entity_id,
          coalesce(p_meta, '{}'::jsonb));
end;
$$;

-- Resolve recorded_by/confirmed_by ids -> emails for journal "who" columns,
-- restricted to members of the caller's own tenant (no cross-tenant leakage).
create or replace function public.tenant_member_emails(p_ids uuid[])
returns table(user_id uuid, email text)
language sql security definer set search_path = '' as $$
  select u.id, u.email::text
  from auth.users u
  where u.id = any(p_ids)
    and exists (
      select 1 from public.tenant_members m
      where m.user_id = u.id and m.tenant_id = public.current_tenant_id()
    );
$$;

grant execute on function public.log_tenant_activity(text, text, uuid, jsonb) to authenticated;
grant execute on function public.tenant_member_emails(uuid[]) to authenticated;
