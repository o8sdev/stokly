-- ── Two plans: trial + normal (paid) ──────────────────────────────────────
-- Collapse the 5-plan ladder to just `trial` + `normal`, with the SAME features
-- on both (no per-plan differences). The only difference is that the trial is
-- time-limited and then suspends (migration 042). Old paid tiers are
-- DEACTIVATED, not deleted, so historical manual_payments / activity FKs survive.

-- The single paid plan. (Don't rename `professional` — plan_features/tenants/
-- manual_payments FK plans.key with no ON UPDATE CASCADE.)
insert into public.plans
  (key, name_az, name_ru, monthly_price, currency, is_trial, is_active, sort_order,
   description_az, description_ru)
values
  ('normal', 'Standart', 'Стандарт', 99, 'AZN', false, true, 1,
   'Tam funksionallıq', 'Полный функционал')
on conflict (key) do update
  set is_active = true, name_az = excluded.name_az, name_ru = excluded.name_ru;

-- Both remaining plans include EVERY feature (also fixes report_inventory_value,
-- which the original CASE ladder accidentally left off every plan).
insert into public.plan_features (plan_key, feature_key, included)
select p.key, f.key, true
from public.plans p cross join public.features f
where p.key in ('trial', 'normal')
on conflict (plan_key, feature_key) do update set included = true;

-- Move any tenant off a removed tier BEFORE deactivating those plans.
update public.tenants set plan_tier = 'normal'
where plan_tier not in ('trial', 'normal');

-- Deactivate the old paid tiers (kept in the table for FK history; hidden from
-- the data-driven admin UI + create-business flow, which only show active plans).
update public.plans set is_active = false
where key in ('starter', 'professional', 'growth', 'enterprise');
