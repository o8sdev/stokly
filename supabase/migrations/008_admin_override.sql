-- ════════════════════════════════════════════════════════════════════════
-- 008 — System-admin override on every tenant-scoped RLS policy
--
-- A platform (system) admin gets god-mode: read/write access to ANY tenant's
-- rows. We append `OR public.is_platform_admin()` to each policy. Combined with
-- app-layer tenant impersonation (a selected-tenant cookie + the normal
-- tenant_id filters), the admin reuses the entire business app for any tenant.
-- Normal tenant members are unaffected.
-- ════════════════════════════════════════════════════════════════════════

-- TENANTS
alter policy "tenant_members_select" on tenants
  using (id = current_tenant_id() or public.is_platform_admin());

-- TENANT_MEMBERS
alter policy "self_select" on tenant_members
  using (user_id = auth.uid() or public.is_platform_admin());

-- SUPPLIERS (for all)
alter policy "tenant_all" on suppliers
  using (tenant_id = current_tenant_id() or public.is_platform_admin())
  with check (tenant_id = current_tenant_id() or public.is_platform_admin());

-- INGREDIENTS
alter policy "tenant_read" on ingredients
  using (tenant_id = current_tenant_id() or public.is_platform_admin());
alter policy "tenant_write" on ingredients
  with check (
    (tenant_id = current_tenant_id()
      and current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );
alter policy "tenant_update" on ingredients
  using (
    (tenant_id = current_tenant_id()
      and current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );

-- RECIPES
alter policy "tenant_read" on recipes
  using (tenant_id = current_tenant_id() or public.is_platform_admin());
alter policy "tenant_write" on recipes
  with check (
    (tenant_id = current_tenant_id()
      and current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );
alter policy "tenant_update" on recipes
  using (
    (tenant_id = current_tenant_id()
      and current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );

-- RECIPE_INGREDIENTS (for all)
alter policy "tenant_all" on recipe_ingredients
  using (
    recipe_id in (select id from recipes where tenant_id = current_tenant_id())
    or public.is_platform_admin()
  )
  with check (
    recipe_id in (select id from recipes where tenant_id = current_tenant_id())
    or public.is_platform_admin()
  );

-- STOCK_MOVEMENTS (append-only)
alter policy "tenant_read" on stock_movements
  using (tenant_id = current_tenant_id() or public.is_platform_admin());
alter policy "tenant_insert" on stock_movements
  with check (tenant_id = current_tenant_id() or public.is_platform_admin());

-- WASTE_CATEGORIES (for all)
alter policy "tenant_all" on waste_categories
  using (tenant_id = current_tenant_id() or public.is_platform_admin())
  with check (tenant_id = current_tenant_id() or public.is_platform_admin());

-- INGREDIENT_BATCHES
alter policy "tenant_read" on ingredient_batches
  using (tenant_id = current_tenant_id() or public.is_platform_admin());
alter policy "tenant_write" on ingredient_batches
  with check (
    (tenant_id = current_tenant_id()
      and current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );
alter policy "tenant_update" on ingredient_batches
  using (
    (tenant_id = current_tenant_id()
      and current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );

-- PRODUCTION_RUNS
alter policy "tenant_read" on production_runs
  using (tenant_id = current_tenant_id() or public.is_platform_admin());
alter policy "tenant_write" on production_runs
  with check (
    (tenant_id = current_tenant_id()
      and current_user_role() in ('owner', 'manager'))
    or public.is_platform_admin()
  );

-- PRODUCTION_RUN_INPUTS (for all)
alter policy "tenant_all" on production_run_inputs
  using (
    production_run_id in (
      select id from production_runs where tenant_id = current_tenant_id()
    )
    or public.is_platform_admin()
  )
  with check (
    production_run_id in (
      select id from production_runs where tenant_id = current_tenant_id()
    )
    or public.is_platform_admin()
  );
