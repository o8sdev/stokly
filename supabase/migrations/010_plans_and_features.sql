-- ════════════════════════════════════════════════════════════════════════
-- 010 — Subscription plans, feature catalog, entitlement matrix, overrides
--
-- A data-driven subscription system, fully editable from the admin console:
--   • plans                    — commercial packaging (price + bilingual meta)
--   • features                 — catalog of gateable capabilities (kill-switch)
--   • plan_features            — the "what each plan includes" toggle matrix
--   • tenant_feature_overrides — per-tenant grant/deny (wins over the plan)
--
-- Packaging tables are readable by any authenticated user (the business app
-- resolves its own entitlements); writes are admin-only. Resolution itself is
-- exposed via SECURITY DEFINER functions added in 011 (after tenants.plan_tier
-- exists).
-- ════════════════════════════════════════════════════════════════════════

-- ── PLANS ────────────────────────────────────────────────────────────────
create table public.plans (
  key            text primary key,
  name_az        text not null,
  name_ru        text not null,
  description_az text,
  description_ru text,
  monthly_price  numeric(12,2) not null default 0,
  currency       text not null default 'AZN',
  is_trial       boolean not null default false,
  is_active      boolean not null default true,
  sort_order     int not null default 0,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users(id) on delete set null
);

-- ── FEATURES (catalog) ───────────────────────────────────────────────────
create table public.features (
  key            text primary key,
  name_az        text not null,
  name_ru        text not null,
  description_az text,
  description_ru text,
  category       text,
  global_enabled boolean not null default true,
  sort_order     int not null default 0
);

-- ── PLAN_FEATURES (entitlement matrix) ───────────────────────────────────
create table public.plan_features (
  plan_key    text not null references public.plans(key) on delete cascade,
  feature_key text not null references public.features(key) on delete cascade,
  included    boolean not null default false,
  primary key (plan_key, feature_key)
);

-- ── TENANT_FEATURE_OVERRIDES (per-tenant grant/deny) ─────────────────────
create table public.tenant_feature_overrides (
  feature_key text not null references public.features(key) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  enabled     boolean not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null,
  primary key (feature_key, tenant_id)
);

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.plans enable row level security;
alter table public.features enable row level security;
alter table public.plan_features enable row level security;
alter table public.tenant_feature_overrides enable row level security;

-- Packaging: any authenticated user may read; only admins may write.
create policy "auth_read" on public.plans
  for select to authenticated using (true);
create policy "admin_write" on public.plans
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "auth_read" on public.features
  for select to authenticated using (true);
create policy "admin_write" on public.features
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "auth_read" on public.plan_features
  for select to authenticated using (true);
create policy "admin_write" on public.plan_features
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Overrides: admin-only (the business app reads entitlements via the resolver).
create policy "admin_all" on public.tenant_feature_overrides
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ── PLAN RANK (ordering for upgrade/downgrade detection) ─────────────────
create or replace function public.plan_rank(p_key text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select sort_order from public.plans where key = p_key), -1);
$$;
grant execute on function public.plan_rank(text) to authenticated;

-- ── SEED: plans (placeholder prices — editable in /admin/plans) ──────────
insert into public.plans
  (key, name_az, name_ru, monthly_price, is_trial, sort_order, description_az, description_ru)
values
  ('trial',        'Sınaq',       'Пробный',              0,   true,  0, '14 günlük pulsuz sınaq', '14-дневный бесплатный период'),
  ('starter',      'Başlanğıc',   'Стартовый',            49,  false, 1, 'Kiçik mətbəxlər üçün',   'Для небольших кухонь'),
  ('professional', 'Peşəkar',     'Профессиональный',     99,  false, 2, 'Tam funksionallıq',      'Полный функционал'),
  ('growth',       'Böyümə',      'Рост',                 169, false, 3, 'Böyüyən restoranlar üçün','Для растущих ресторанов'),
  ('enterprise',   'Müəssisə',    'Корпоративный',        299, false, 4, 'Şəbəkələr üçün',         'Для сетей');

-- ── SEED: features (gateable Phase-1 capabilities) ───────────────────────
insert into public.features
  (key, name_az, name_ru, category, sort_order, description_az, description_ru)
values
  ('ingredient_library',     'İnqrediyent kitabxanası', 'Библиотека ингредиентов', 'data',      1, 'Hazır inqrediyent kataloqu',      'Готовый каталог ингредиентов'),
  ('bulk_import',            'Toplu idxal',             'Массовый импорт',          'data',      2, 'Excel/CSV ilə toplu idxal',        'Массовый импорт через Excel/CSV'),
  ('batch_expiry',          'Partiya və son istifadə', 'Партии и срок годности',   'inventory', 3, 'Partiya izləmə və xəbərdarlıqlar', 'Отслеживание партий и оповещения'),
  ('onboarding_screen',     'Onboarding ekranı',       'Экран онбординга',         'ux',        4, 'Xoş gəlmisiniz başlanğıc ekranı',  'Приветственный экран'),
  ('report_food_cost',      'Maya dəyəri hesabatı',    'Отчёт себестоимости',      'reports',   5, 'Yemək maya dəyəri hesabatı',       'Отчёт себестоимости блюд'),
  ('report_inventory_value','İnventar dəyəri hesabatı','Отчёт стоимости запасов',  'reports',   6, 'İnventar dəyəri hesabatı',         'Отчёт стоимости запасов');

-- ── SEED: plan_features matrix (sensible default ladder) ─────────────────
-- Basics on every plan; advanced features from professional up; trial gets the
-- full experience to drive conversion. All editable in /admin/plans.
insert into public.plan_features (plan_key, feature_key, included)
select p.key, f.key,
  case
    when f.key in ('onboarding_screen', 'ingredient_library', 'report_food_cost')
      then true
    when f.key in ('bulk_import', 'batch_expiry', 'report_inventory_value')
      then p.key in ('trial', 'professional', 'growth', 'enterprise')
    else false
  end
from public.plans p cross join public.features f;
