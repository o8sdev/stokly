-- TENANTS
-- Each restaurant is one tenant. Root of all RLS policies.
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  currency text not null default 'AZN',
  locale text not null default 'az',
  created_at timestamptz not null default now()
);

-- TENANT MEMBERS
-- Links auth.users to tenants with a role.
create table tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  unique(tenant_id, user_id)
);

-- SUPPLIERS
-- Supplier directory per tenant.
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

-- INGREDIENTS
-- Master ingredient catalog.
-- yield_percent: usable % after prep loss (e.g. 0.78 means 78g usable per 100g purchased)
-- unit: the base purchase unit (kg, litre, piece, etc.)
create table ingredients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  name_az text,
  name_ru text,
  unit text not null,
  cost_per_unit numeric(12,4) not null default 0,
  yield_percent numeric(5,4) not null default 1.0,
  supplier_id uuid references suppliers(id) on delete set null,
  low_stock_threshold numeric(12,3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RECIPES
-- A dish or sub-recipe. Sub-recipes (is_sub_recipe=true) are used as
-- components inside other recipes (e.g. "tomato sauce" used in multiple dishes).
create table recipes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  name_az text,
  name_ru text,
  is_sub_recipe boolean not null default false,
  serving_size numeric(10,3),
  serving_unit text,
  sale_price numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RECIPE INGREDIENTS
-- Links ingredients (and sub-recipes) to a recipe with quantity.
-- ingredient_id XOR sub_recipe_id — one must be set, not both.
create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid references ingredients(id) on delete restrict,
  sub_recipe_id uuid references recipes(id) on delete restrict,
  quantity numeric(12,4) not null,
  unit text not null,
  -- Yield override: if null, use ingredient.yield_percent
  yield_override numeric(5,4),
  constraint one_source check (
    (ingredient_id is not null and sub_recipe_id is null) or
    (ingredient_id is null and sub_recipe_id is not null)
  )
);

-- STOCK MOVEMENTS
-- Append-only event log. NEVER update or delete rows.
-- Current stock is always DERIVED from this log, never stored directly.
-- movement_type values:
--   delivery    — stock received from supplier
--   count       — manual stock count (sets absolute level)
--   waste       — recorded waste/spoilage
--   adjustment  — manual correction with reason
--   sale        — deducted by a sale (Phase 3 — POS integration)
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  movement_type text not null check (
    movement_type in ('delivery', 'count', 'waste', 'adjustment', 'sale')
  ),
  quantity numeric(12,4) not null,
  -- For 'count': quantity IS the new absolute level
  -- For all others: quantity is the delta (positive = in, negative = out)
  is_absolute boolean not null default false,
  unit_cost numeric(12,4),
  supplier_id uuid references suppliers(id) on delete set null,
  reason text,
  notes text,
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- WASTE CATEGORIES
-- Lookup table for waste reasons.
create table waste_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  name_az text,
  name_ru text
);

-- Seed default waste categories (added per-tenant on signup)
-- Values: Spoilage, Over-prep, Dropped, Expired, Other

-- INDEXES
create index idx_stock_movements_tenant_ingredient
  on stock_movements(tenant_id, ingredient_id, created_at desc);

create index idx_stock_movements_type
  on stock_movements(tenant_id, movement_type, created_at desc);

create index idx_ingredients_tenant
  on ingredients(tenant_id);

create index idx_recipes_tenant
  on recipes(tenant_id);

-- UPDATED_AT TRIGGER
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_ingredients_updated_at
  before update on ingredients
  for each row execute function set_updated_at();

create trigger set_recipes_updated_at
  before update on recipes
  for each row execute function set_updated_at();
