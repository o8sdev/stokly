-- 061_drop_global_library.sql
-- Remove the global ingredient library entirely (admin catalog + tenant
-- quick-add / browse / import-from-library all removed in the same change).
-- The table is standalone (not referenced by any FK), so a plain drop is safe.
drop table if exists public.global_ingredient_library cascade;
