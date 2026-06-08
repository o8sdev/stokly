-- ════════════════════════════════════════════════════════════════════════
-- 006 — Demo-request capture + platform (system) admin
--
-- Go-to-market change: the public site is lead-capture only ("request a demo").
-- No public signup. A hidden, role-gated admin reviews the demo requests.
--   • demo_requests  — leads submitted from the landing (public INSERT via a
--                      SECURITY DEFINER function; only admins can read/update)
--   • platform_admins — allowlist of system-admin users (above any tenant)
-- ════════════════════════════════════════════════════════════════════════

-- ── PLATFORM ADMINS ─────────────────────────────────────────────────────
create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;

-- An admin may read their own membership row (used by the app to confirm role).
create policy "self_admin_select" on public.platform_admins
  for select using (user_id = auth.uid());

-- Helper: is the current user a system admin? SECURITY DEFINER so it can read
-- the allowlist regardless of the caller's RLS.
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

-- ── DEMO REQUESTS ───────────────────────────────────────────────────────
create table public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  restaurant_name text,
  email text not null,
  message text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'sent', 'closed')),
  created_at timestamptz not null default now()
);
alter table public.demo_requests enable row level security;

create index idx_demo_requests_created
  on public.demo_requests(created_at desc);

-- Only system admins can read or update leads. There is intentionally NO anon
-- SELECT policy — submissions go through the function below.
create policy "admin_read" on public.demo_requests
  for select using (public.is_platform_admin());
create policy "admin_update" on public.demo_requests
  for update using (public.is_platform_admin());

-- Public submit: SECURITY DEFINER so anonymous visitors can insert a lead
-- without the table being writable directly. Basic validation inside.
create or replace function public.submit_demo_request(
  p_name text,
  p_restaurant text,
  p_email text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_email), '') = '' then
    raise exception 'name and email are required';
  end if;
  if position('@' in p_email) = 0 then
    raise exception 'invalid email';
  end if;

  insert into public.demo_requests (name, restaurant_name, email, message)
  values (
    trim(p_name),
    nullif(trim(coalesce(p_restaurant, '')), ''),
    trim(p_email),
    nullif(trim(coalesce(p_message, '')), '')
  );
end;
$$;

grant execute on function public.submit_demo_request(text, text, text, text)
  to anon, authenticated;
