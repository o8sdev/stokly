-- ── Comp / staff-meal sales lines ────────────────────────────────────────────
-- Owners and staff eat without paying: the ingredients ARE consumed, but no
-- money comes in. A comp line behaves exactly like a sale for stock purposes
-- (recipe explosion, FIFO deduction, theoretical usage) but contributes ZERO to
-- the day's revenue, and reporting shows comps separately. unit_price still
-- snapshots the menu price so the "lost revenue" of comps is visible.
alter table public.daily_sales_items
  add column if not exists is_comp boolean not null default false;
