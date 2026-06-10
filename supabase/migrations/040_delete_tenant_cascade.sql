-- ── delete_tenant_cascade — ordered hard-delete of a tenant + all its data ──
-- The plain `delete from tenants` relies on FK cascade, but it fails for any
-- tenant with real data because:
--   • recipe_ingredients/stock_movements/ingredient_batches/sale_batch_consumption/
--     waste_batch_consumption reference ingredients with ON DELETE RESTRICT/NO ACTION;
--   • daily_sales_items.recipe_id and recipe_ingredients.sub_recipe_id are RESTRICT;
--   • a confirmed daily_sales day is locked by the guard_confirmed_sale_items trigger;
--   • stock_movements ↔ ingredient_batches reference each other (NO ACTION cycle).
-- This deletes children in dependency order (unlock confirmed days + break the
-- movement↔batch cycle first), all in one transaction, then the tenant (whose
-- remaining tenant_id children are ON DELETE CASCADE). Platform-admin only.
create or replace function public.delete_tenant_cascade(p_tenant uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;
  if p_tenant is null then
    raise exception 'tenant required';
  end if;

  -- Unlock confirmed sales days so their items can be deleted past the guard trigger.
  update public.daily_sales set status = 'draft'
    where tenant_id = p_tenant and status <> 'draft';

  -- Batch-consumption + itemized sales + production inputs first (they reference
  -- batches / recipes / sales via RESTRICT/NO ACTION).
  delete from public.sale_batch_consumption where tenant_id = p_tenant;
  delete from public.waste_batch_consumption where tenant_id = p_tenant;
  delete from public.daily_sales_items where tenant_id = p_tenant;
  delete from public.production_run_inputs
    where production_run_id in (
      select id from public.production_runs where tenant_id = p_tenant
    );
  delete from public.production_runs where tenant_id = p_tenant;
  delete from public.recipe_ingredients
    where recipe_id in (
      select id from public.recipes where tenant_id = p_tenant
    );

  -- Break the stock_movements ↔ ingredient_batches NO ACTION cycle, then delete
  -- batches (now unreferenced) and movements (batches gone → no created_from refs).
  update public.stock_movements set batch_id = null where tenant_id = p_tenant;
  delete from public.ingredient_batches where tenant_id = p_tenant;
  delete from public.stock_movements where tenant_id = p_tenant;

  delete from public.daily_sales where tenant_id = p_tenant;
  delete from public.recipes where tenant_id = p_tenant;
  delete from public.ingredients where tenant_id = p_tenant;

  -- Remaining tenant_id children (count_periods, storage_locations, tenant_members,
  -- waste_categories, activity_events, admin_notes/notifications, manual_payments,
  -- tenant_feature_overrides) are ON DELETE CASCADE.
  delete from public.tenants where id = p_tenant;
end;
$$;

revoke all on function public.delete_tenant_cascade(uuid) from public;
grant execute on function public.delete_tenant_cascade(uuid) to authenticated;
