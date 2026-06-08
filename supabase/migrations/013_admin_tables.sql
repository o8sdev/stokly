-- ════════════════════════════════════════════════════════════════════════
-- 013 — Admin operational tables (all admin-only via is_platform_admin())
--   manual_payments · invitations · admin_notes · admin_audit_log ·
--   admin_notifications
-- FKs to auth.users use ON DELETE SET NULL so history survives account removal.
-- ════════════════════════════════════════════════════════════════════════

create type public.payment_method   as enum ('bank_transfer', 'cash', 'other');
create type public.invitation_status as enum ('unused', 'redeemed', 'revoked', 'expired');
create type public.notification_type as enum
  ('new_signup', 'trial_expiring', 'onboarding_stuck', 'no_login', 'payment_overdue', 'plan_upgraded');

-- ── MANUAL PAYMENTS (bank transfer / cash — no Stripe) ───────────────────
create table public.manual_payments (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  amount       numeric(12,2) not null check (amount >= 0),
  currency     text not null default 'AZN',
  method       public.payment_method not null default 'bank_transfer',
  plan_key     text references public.plans(key) on delete set null,
  reference    text,
  period_start date,
  period_end   date,
  paid_at      timestamptz not null default now(),
  note         text,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index manual_payments_tenant_idx  on public.manual_payments(tenant_id, paid_at desc);
create index manual_payments_paid_at_idx on public.manual_payments(paid_at);
create index manual_payments_ref_idx     on public.manual_payments(reference);

-- ── INVITATIONS (invite-only onboarding codes) ──────────────────────────
create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  email       text,
  plan_key    text not null default 'trial' references public.plans(key),
  status      public.invitation_status not null default 'unused',
  tenant_id   uuid references public.tenants(id) on delete set null,
  expires_at  timestamptz,
  redeemed_at timestamptz,
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index invitations_status_idx on public.invitations(status, created_at desc);
create index invitations_email_idx  on public.invitations(email);

-- ── ADMIN NOTES (internal per-tenant comments) ──────────────────────────
create table public.admin_notes (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  body         text not null,
  author_id    uuid references auth.users(id) on delete set null,
  author_email text,
  created_at   timestamptz not null default now()
);
create index admin_notes_tenant_idx on public.admin_notes(tenant_id, created_at desc);

-- ── ADMIN AUDIT LOG (every admin action) ────────────────────────────────
create table public.admin_audit_log (
  id               uuid primary key default gen_random_uuid(),
  actor_id         uuid references auth.users(id) on delete set null,
  actor_email      text,
  action           text not null,
  target_tenant_id uuid references public.tenants(id) on delete set null,
  details          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index admin_audit_tenant_idx  on public.admin_audit_log(target_tenant_id, created_at desc);
create index admin_audit_action_idx  on public.admin_audit_log(action, created_at desc);
create index admin_audit_created_idx on public.admin_audit_log(created_at desc);

-- ── ADMIN NOTIFICATIONS (auto-generated alerts) ─────────────────────────
create table public.admin_notifications (
  id         uuid primary key default gen_random_uuid(),
  type       public.notification_type not null,
  tenant_id  uuid references public.tenants(id) on delete cascade,
  title      text not null,
  body       text,
  dedupe_key text not null unique,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index admin_notifications_unread_idx on public.admin_notifications(created_at desc) where read_at is null;
create index admin_notifications_tenant_idx on public.admin_notifications(tenant_id, created_at desc);

-- ── RLS: all admin-only ──────────────────────────────────────────────────
alter table public.manual_payments     enable row level security;
alter table public.invitations         enable row level security;
alter table public.admin_notes         enable row level security;
alter table public.admin_audit_log     enable row level security;
alter table public.admin_notifications enable row level security;

create policy "admin_all" on public.manual_payments     for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "admin_all" on public.invitations         for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "admin_all" on public.admin_notes         for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "admin_all" on public.admin_audit_log     for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "admin_all" on public.admin_notifications for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
