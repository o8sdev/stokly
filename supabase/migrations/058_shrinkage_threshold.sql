-- 058_shrinkage_threshold.sql
-- Per-tenant shrinkage alert threshold (percent). When a period's actual usage
-- of an ingredient exceeds the recipe-predicted (theoretical) usage by more than
-- this %, the period report flags it as possible over-portioning / unrecorded
-- waste / theft. Pure read-side over the already-frozen report_data — no data
-- migration. Default 10%.
alter table public.tenants
  add column if not exists shrinkage_threshold_pct numeric(5, 2) not null default 10;
