-- ── BUSINESS TYPE + TYPE-AWARE LIBRARY ────────────────────────────────────
-- A tenant picks a business type on first run (restaurant, cafe, pizzeria, …).
-- Library items can be tagged with the business types they suit; an item with
-- NO tags (null) is universal and shown to everyone. Tenant-facing library
-- surfaces then show: untagged items + items tagged with the tenant's type.

alter table public.tenants
  add column if not exists business_type text;

alter table public.global_ingredient_library
  add column if not exists business_types text[];
