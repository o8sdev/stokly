-- Escape hatch for the first-run onboarding card. Onboarding "completion" is
-- otherwise derived from real data (business type + ingredients + recipes +
-- initial count). But a business that legitimately doesn't use recipes would be
-- trapped with the Getting-Started card forever. This lets them explicitly
-- dismiss it; once set, the dashboard renders the normal view.
alter table public.tenants
  add column if not exists onboarding_dismissed_at timestamptz;
