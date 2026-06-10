-- ── MULTIPLE CONSUMPTION POINTS — feature gate (Phase 3) ───────────────────
-- `multi_location` gates designating MORE THAN ONE consumption point, routing
-- recipes to a location, and per-location reporting. Basic locations + transfers
-- stay free on every plan. Included for Professional+ (and trial, to drive
-- conversion); fully admin-editable in /admin/plans (the matrix auto-renders it).
insert into public.features
  (key, name_az, name_ru, category, sort_order, description_az, description_ru)
values
  ('multi_location', 'Çoxlu istehlak nöqtəsi', 'Несколько точек списания', 'inventory', 7,
   'Bar və mətbəx kimi ayrı-ayrı istehlak nöqtələri', 'Отдельные точки списания (бар, кухня)')
on conflict (key) do nothing;

insert into public.plan_features (plan_key, feature_key, included)
select p.key, 'multi_location', p.key in ('trial', 'professional', 'growth', 'enterprise')
from public.plans p
on conflict (plan_key, feature_key) do nothing;
