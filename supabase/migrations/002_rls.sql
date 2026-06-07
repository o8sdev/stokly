-- Enable RLS on all tables
alter table tenants enable row level security;
alter table tenant_members enable row level security;
alter table suppliers enable row level security;
alter table ingredients enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table stock_movements enable row level security;
alter table waste_categories enable row level security;

-- Helper function: get current user's tenant_id
-- Used in all RLS policies to avoid repeated subqueries
create or replace function current_tenant_id()
returns uuid as $$
  select tenant_id from tenant_members
  where user_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- Helper function: get current user's role
create or replace function current_user_role()
returns text as $$
  select role from tenant_members
  where user_id = auth.uid()
  and tenant_id = current_tenant_id()
  limit 1;
$$ language sql security definer stable;

-- TENANTS: members can read their own tenant
create policy "tenant_members_select" on tenants
  for select using (id = current_tenant_id());

-- TENANT_MEMBERS: members can read their own membership
create policy "self_select" on tenant_members
  for select using (user_id = auth.uid());

-- SUPPLIERS: all tenant members can read/write
create policy "tenant_all" on suppliers
  for all using (tenant_id = current_tenant_id());

-- INGREDIENTS: all tenant members can read; owners+managers can write
create policy "tenant_read" on ingredients
  for select using (tenant_id = current_tenant_id());
create policy "tenant_write" on ingredients
  for insert with check (tenant_id = current_tenant_id()
    and current_user_role() in ('owner', 'manager'));
create policy "tenant_update" on ingredients
  for update using (tenant_id = current_tenant_id()
    and current_user_role() in ('owner', 'manager'));

-- RECIPES: same as ingredients
create policy "tenant_read" on recipes
  for select using (tenant_id = current_tenant_id());
create policy "tenant_write" on recipes
  for insert with check (tenant_id = current_tenant_id()
    and current_user_role() in ('owner', 'manager'));
create policy "tenant_update" on recipes
  for update using (tenant_id = current_tenant_id()
    and current_user_role() in ('owner', 'manager'));

-- RECIPE_INGREDIENTS: inherit from recipes
create policy "tenant_all" on recipe_ingredients
  for all using (
    recipe_id in (
      select id from recipes where tenant_id = current_tenant_id()
    )
  );

-- STOCK_MOVEMENTS: all members can insert; all can read
-- NO UPDATE or DELETE policies — append-only by design
create policy "tenant_read" on stock_movements
  for select using (tenant_id = current_tenant_id());
create policy "tenant_insert" on stock_movements
  for insert with check (tenant_id = current_tenant_id());

-- WASTE_CATEGORIES
create policy "tenant_all" on waste_categories
  for all using (tenant_id = current_tenant_id());
