-- 054_archive_master_data.sql
-- Soft-delete (archive) for master data. Industry practice: master records are
-- archived (deactivated), never hard-deleted, so the append-only stock ledger,
-- cost batches, recipe lines, purchase history and period snapshots that
-- reference them stay intact and auditable. Archived rows are hidden from
-- active lists/pickers (an app-level `archived_at is null` filter) but remain
-- tenant-readable for history + restore.
--
-- No FK or RLS change is needed: the existing SELECT policies (tenant_read /
-- tenant_all) already expose these rows to the tenant, and the owner/manager
-- UPDATE policies (tenant_update / tenant_all) cover both archive and restore.
-- Existing FKs already forbid a hard delete once a row is referenced
-- (stock_movements/recipe_ingredients are ON DELETE RESTRICT), so archive is
-- the only safe retire path.

alter table public.ingredients       add column if not exists archived_at timestamptz;
alter table public.recipes           add column if not exists archived_at timestamptz;
alter table public.suppliers         add column if not exists archived_at timestamptz;
alter table public.storage_locations add column if not exists archived_at timestamptz;

-- Keep the common path (active-list scans) cheap.
create index if not exists ingredients_active_idx
  on public.ingredients (tenant_id) where archived_at is null;
create index if not exists recipes_active_idx
  on public.recipes (tenant_id) where archived_at is null;
create index if not exists suppliers_active_idx
  on public.suppliers (tenant_id) where archived_at is null;
create index if not exists storage_locations_active_idx
  on public.storage_locations (tenant_id) where archived_at is null;
