-- Remove the business-type → library association. The product no longer filters
-- the ingredient library by a tenant's business type; every tenant sees the full
-- library. tenants.business_type stays (businesses still choose/show their type).
alter table public.global_ingredient_library
  drop column if exists business_types;
