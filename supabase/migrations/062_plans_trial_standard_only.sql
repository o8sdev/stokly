-- 062_plans_trial_standard_only.sql
-- Keep only the two plans the landing page advertises: trial (Sınaq, 0 ₼) and
-- normal (Standart, 99 ₼/ay). The four legacy tiers (starter, professional,
-- growth, enterprise) were already inactive and unreferenced (0 tenants /
-- invitations / payments). Deleting a plan cascades its plan_features rows.
delete from public.plans
where key in ('starter', 'professional', 'growth', 'enterprise');
