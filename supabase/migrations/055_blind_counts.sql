-- 055_blind_counts.sql
-- Blind stock counts (anti-cheating). When on, the count form hides the
-- expected on-hand quantity while staff count, revealing the variance only
-- after submit — so a count can't be rubber-stamped to match the expected
-- number. Purely a UI gate: record_stock_count (052) still derives the delta
-- server-side and the ledger stays append-only.
alter table public.tenants
  add column if not exists blind_counts boolean not null default false;
