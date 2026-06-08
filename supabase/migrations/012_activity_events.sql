-- ════════════════════════════════════════════════════════════════════════
-- 012 — Activity events (the login/usage backbone)
--
-- Single store powering: the admin activity feed, health-score login metrics,
-- onboarding milestone detection, and lifecycle notifications. Written by the
-- business app via the SECURITY DEFINER log_activity() so members never need
-- direct write access. Admin-only to read.
--
-- Event types: login | report_viewed | signup | payment_received | plan_changed
-- ════════════════════════════════════════════════════════════════════════

create table public.activity_events (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  type       text not null,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_created_idx        on public.activity_events(created_at desc);
create index activity_events_tenant_created_idx on public.activity_events(tenant_id, created_at desc);
create index activity_events_tenant_type_idx    on public.activity_events(tenant_id, type, created_at desc);

alter table public.activity_events enable row level security;
create policy "admin_all" on public.activity_events
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Emitter: lets the business app record events without widening RLS to members.
create or replace function public.log_activity(
  p_tenant uuid, p_user uuid, p_type text, p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_events (tenant_id, user_id, type, metadata)
  values (p_tenant, p_user, p_type, coalesce(p_meta, '{}'::jsonb));
end;
$$;
grant execute on function public.log_activity(uuid, uuid, text, jsonb) to authenticated;
