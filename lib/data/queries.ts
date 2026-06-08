import { createClient } from '@/lib/supabase/server'
import type {
  Ingredient,
  Recipe,
  RecipeIngredient,
  StockMovement,
  Supplier,
  WasteCategory,
  Tenant,
} from '@/types/database'
import type { IngredientBatch } from '@/types/app'
import type { GlobalIngredient } from '@/types/database'

// All loaders take an explicit tenantId (resolved via requireTenant) so the
// tenant scope is always server-controlled. RLS provides defence in depth.

export async function getIngredients(
  tenantId: string
): Promise<Ingredient[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('ingredients')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })
  return data ?? []
}

export async function getIngredient(
  tenantId: string,
  id: string
): Promise<Ingredient | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('ingredients')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .maybeSingle()
  return data ?? null
}

export async function getSuppliers(tenantId: string): Promise<Supplier[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('suppliers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })
  return data ?? []
}

export async function getRecipes(tenantId: string): Promise<Recipe[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('recipes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })
  return data ?? []
}

export async function getRecipe(
  tenantId: string,
  id: string
): Promise<Recipe | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('recipes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .maybeSingle()
  return data ?? null
}

// All recipe_ingredient lines for the tenant's recipes. recipe_ingredients
// has no tenant_id column, so we scope through the recipes table.
export async function getRecipeIngredients(
  tenantId: string
): Promise<RecipeIngredient[]> {
  const supabase = createClient()
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id')
    .eq('tenant_id', tenantId)
  const ids = (recipes ?? []).map((r) => r.id)
  if (ids.length === 0) return []
  const { data } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .in('recipe_id', ids)
  return data ?? []
}

export async function getRecipeLines(
  recipeId: string
): Promise<RecipeIngredient[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .eq('recipe_id', recipeId)
  return data ?? []
}

export async function getStockMovements(
  tenantId: string
): Promise<StockMovement[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getRecentMovements(
  tenantId: string,
  limit = 10
): Promise<StockMovement[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getWasteCategories(
  tenantId: string
): Promise<WasteCategory[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('waste_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })
  return data ?? []
}

// All active batches for the tenant, ordered FIFO (oldest received first).
// SUM(quantity_remaining) per ingredient must equal deriveStockLevel() — see
// the invariant note in lib/calculations/stock-level.ts.
export async function getActiveBatches(
  tenantId: string
): Promise<IngredientBatch[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('ingredient_batches')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('received_date', { ascending: true })
  return (data ?? []) as IngredientBatch[]
}

// The global quick-start catalog (not tenant-scoped; public read).
export async function getGlobalLibrary(): Promise<GlobalIngredient[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('global_ingredient_library')
    .select('*')
    .order('category', { ascending: true })
    .order('name_az', { ascending: true })
  return data ?? []
}

// Just the everyday basics (is_common), for the one-click quick-add chips.
export async function getCommonLibrary(): Promise<GlobalIngredient[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('global_ingredient_library')
    .select('*')
    .eq('is_common', true)
    .order('category', { ascending: true })
    .order('name_az', { ascending: true })
  return data ?? []
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .maybeSingle()
  return data ?? null
}
