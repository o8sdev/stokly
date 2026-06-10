import { createClient } from '@/lib/supabase/server'
import type {
  Ingredient,
  Recipe,
  RecipeIngredient,
  StockMovement,
  Supplier,
  StorageLocation,
  WasteCategory,
  Tenant,
} from '@/types/database'
import type { IngredientBatch } from '@/types/app'
import type { GlobalIngredient } from '@/types/database'
import { deriveAllStockLevels } from '@/lib/calculations/stock-level'
import { computeTheoreticalUsage } from '@/lib/calculations/theoretical-usage'

const round3 = (n: number): number => Math.round(n * 1000) / 1000

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

// Per-tenant storage locations (Warehouse, Kitchen, …), ordered for display.
export async function getStorageLocations(
  tenantId: string
): Promise<StorageLocation[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('storage_locations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  return data ?? []
}

export interface LocationStock {
  ingredient_id: string
  location_id: string | null
  qty: number
}

// Active stock per (ingredient, location), summed across batches. Powers the
// move-stock "available here" hint and the inventory per-location breakdown.
export async function getStockByLocation(
  tenantId: string
): Promise<LocationStock[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('ingredient_batches')
    .select('ingredient_id, location_id, quantity_remaining')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .gt('quantity_remaining', 0)
  const map = new Map<string, LocationStock>()
  for (const r of data ?? []) {
    const key = `${r.ingredient_id}:${r.location_id ?? ''}`
    const qty = Number(r.quantity_remaining)
    const cur = map.get(key)
    if (cur) cur.qty += qty
    else map.set(key, { ingredient_id: r.ingredient_id, location_id: r.location_id, qty })
  }
  return [...map.values()]
}

// Set of location ids that still hold active stock — used to block deletion.
export async function getLocationsInUse(
  tenantId: string
): Promise<Set<string>> {
  const supabase = createClient()
  const { data } = await supabase
    .from('ingredient_batches')
    .select('location_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .gt('quantity_remaining', 0)
  const used = new Set<string>()
  for (const r of data ?? []) {
    if (r.location_id) used.add(r.location_id)
  }
  return used
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

export interface WasteLogEntry {
  id: string
  ingredient_id: string
  ingredient_name: string
  unit: string
  quantity: number
  unit_cost: number
  value: number
  category_name: string | null
  reason: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
  reversed: boolean
}

// Browsable waste log for a date range (inclusive). Each entry carries the
// ingredient + category name, the snapshotted value (qty × unit_cost), and
// whether it was later reversed (an `adjustment` points back at it).
export async function getWasteLog(
  tenantId: string,
  from: string,
  to: string
): Promise<WasteLogEntry[]> {
  const supabase = createClient()
  const fromStart = `${from}T00:00:00.000Z`
  const toEnd = `${to}T23:59:59.999Z`

  const [wasteRes, revRes, ings, cats] = await Promise.all([
    supabase
      .from('stock_movements')
      .select(
        'id, ingredient_id, quantity, unit_cost, reason, notes, waste_category_id, recorded_by, created_at'
      )
      .eq('tenant_id', tenantId)
      .eq('movement_type', 'waste')
      .gte('created_at', fromStart)
      .lte('created_at', toEnd)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('stock_movements')
      .select('reverses_movement_id')
      .eq('tenant_id', tenantId)
      .not('reverses_movement_id', 'is', null),
    getIngredients(tenantId),
    getWasteCategories(tenantId),
  ])

  const ingMap = new Map(ings.map((i) => [i.id, i]))
  const catMap = new Map(cats.map((c) => [c.id, c]))
  const reversed = new Set(
    (revRes.data ?? []).map((r) => r.reverses_movement_id as string)
  )

  return (wasteRes.data ?? []).map((w) => {
    const ing = ingMap.get(w.ingredient_id)
    const qty = Number(w.quantity)
    const cost = Number(w.unit_cost ?? 0)
    return {
      id: w.id,
      ingredient_id: w.ingredient_id,
      ingredient_name: ing?.name ?? '—',
      unit: ing?.unit ?? '',
      quantity: qty,
      unit_cost: cost,
      value: qty * cost,
      category_name: w.waste_category_id
        ? (catMap.get(w.waste_category_id)?.name ?? null)
        : null,
      reason: w.reason,
      notes: w.notes,
      recorded_by: w.recorded_by,
      created_at: w.created_at,
      reversed: reversed.has(w.id),
    }
  })
}

export interface ProductionRunView {
  id: string
  output_name: string
  output_quantity: number
  output_unit: string
  output_unit_cost: number | null
  actual_yield_percent: number | null
  produced_at: string
  voided: boolean
}

// Recent production runs with the produced ingredient's name + voided flag.
export async function getProductionRuns(
  tenantId: string
): Promise<ProductionRunView[]> {
  const supabase = createClient()
  const [runsRes, voidRes, ings] = await Promise.all([
    supabase
      .from('production_runs')
      .select(
        'id, output_ingredient_id, output_quantity, output_unit, output_unit_cost, actual_yield_percent, produced_at'
      )
      .eq('tenant_id', tenantId)
      .order('produced_at', { ascending: false })
      .limit(100),
    supabase
      .from('stock_movements')
      .select('production_run_id')
      .eq('tenant_id', tenantId)
      .eq('reason', 'production_void'),
    getIngredients(tenantId),
  ])
  const ingMap = new Map(ings.map((i) => [i.id, i]))
  const voided = new Set(
    (voidRes.data ?? []).map((r) => r.production_run_id as string | null)
  )
  return (runsRes.data ?? []).map((r) => ({
    id: r.id,
    output_name: ingMap.get(r.output_ingredient_id)?.name ?? '—',
    output_quantity: Number(r.output_quantity),
    output_unit: r.output_unit,
    output_unit_cost: r.output_unit_cost,
    actual_yield_percent: r.actual_yield_percent,
    produced_at: r.produced_at,
    voided: voided.has(r.id),
  }))
}

export interface PurchaseLogEntry {
  id: string
  ingredient_id: string
  ingredient_name: string
  unit: string
  quantity: number
  unit_cost: number
  value: number
  supplier_name: string | null
  notes: string | null
  created_at: string
}

// Browsable purchase (delivery) log for a date range (inclusive). Each entry is
// one bought line: ingredient + supplier name + the spend (qty × unit_cost).
export async function getPurchaseLog(
  tenantId: string,
  from: string,
  to: string
): Promise<PurchaseLogEntry[]> {
  const supabase = createClient()
  const fromStart = `${from}T00:00:00.000Z`
  const toEnd = `${to}T23:59:59.999Z`

  const [delRes, ings, suppliers] = await Promise.all([
    supabase
      .from('stock_movements')
      .select(
        'id, ingredient_id, quantity, unit_cost, supplier_id, notes, created_at'
      )
      .eq('tenant_id', tenantId)
      .eq('movement_type', 'delivery')
      .gte('created_at', fromStart)
      .lte('created_at', toEnd)
      .order('created_at', { ascending: false })
      .limit(1000),
    getIngredients(tenantId),
    getSuppliers(tenantId),
  ])

  const ingMap = new Map(ings.map((i) => [i.id, i]))
  const supMap = new Map(suppliers.map((s) => [s.id, s]))

  return (delRes.data ?? []).map((d) => {
    const ing = ingMap.get(d.ingredient_id)
    const qty = Number(d.quantity)
    const cost = Number(d.unit_cost ?? 0)
    return {
      id: d.id,
      ingredient_id: d.ingredient_id,
      ingredient_name: ing?.name ?? '—',
      unit: ing?.unit ?? '',
      quantity: qty,
      unit_cost: cost,
      value: qty * cost,
      supplier_name: d.supplier_id
        ? (supMap.get(d.supplier_id)?.name ?? null)
        : null,
      notes: d.notes,
      created_at: d.created_at,
    }
  })
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
// Full library, unfiltered — for the system-admin catalog page.
export async function getGlobalLibrary(): Promise<GlobalIngredient[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('global_ingredient_library')
    .select('*')
    .order('category', { ascending: true })
    .order('name_az', { ascending: true })
  return data ?? []
}

// Everyday basics (is_common) for the one-click quick-add chips — the full set,
// shown to every tenant regardless of business type.
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

export interface DayConfirmPreviewLine {
  ingredient_id: string
  ingredient_name: string
  unit: string
  quantity: number
  current_stock: number
  short: boolean
}
export interface DayConfirmPreview {
  lines: DayConfirmPreviewLine[]
  cogs: number
  any_short: boolean
}

// The inventory impact of confirming a day's itemized sales — what the
// confirm_daily_sales RPC will deduct. Shown on the review/confirm screen so the
// user catches an obviously-wrong quantity BEFORE it's locked.
export async function getDayConfirmPreview(
  tenantId: string,
  dayId: string
): Promise<DayConfirmPreview> {
  const supabase = createClient()
  const { data: items } = await supabase
    .from('daily_sales_items')
    .select('recipe_id, quantity')
    .eq('daily_sales_id', dayId)
  const sold = (items ?? []).map((i) => ({
    recipe_id: i.recipe_id,
    quantity: Number(i.quantity),
  }))

  const [ingredients, recipes, recipeIngredients, movements, locations, byLoc] =
    await Promise.all([
      getIngredients(tenantId),
      getRecipes(tenantId),
      getRecipeIngredients(tenantId),
      getStockMovements(tenantId),
      getStorageLocations(tenantId),
      getStockByLocation(tenantId),
    ])

  const { usageByIngredient, theoreticalCogs } = computeTheoreticalUsage(
    sold,
    ingredients,
    recipes,
    recipeIngredients
  )
  const levels = deriveAllStockLevels(movements)
  const ingById = new Map(ingredients.map((i) => [i.id, i]))

  // Sales consume the KITCHEN, so "available" here means kitchen stock — except
  // for ingredients that have never been batch-tracked (count-only), which fall
  // back to the derived total, matching confirm_daily_sales. "Ever batched" keys
  // on any batch row (any status), exactly like the RPC's no-batch decision.
  const kitchenId = locations.find((l) => l.is_kitchen)?.id ?? null
  const kitchenQty = new Map<string, number>()
  for (const s of byLoc) {
    if (s.location_id === kitchenId) {
      kitchenQty.set(s.ingredient_id, (kitchenQty.get(s.ingredient_id) ?? 0) + s.qty)
    }
  }
  const { data: batchRows } = await supabase
    .from('ingredient_batches')
    .select('ingredient_id')
    .eq('tenant_id', tenantId)
  const everBatched = new Set((batchRows ?? []).map((r) => r.ingredient_id))

  const lines: DayConfirmPreviewLine[] = [...usageByIngredient.entries()]
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const ing = ingById.get(id)
      const available = everBatched.has(id)
        ? kitchenQty.get(id) ?? 0
        : levels.get(id) ?? 0
      return {
        ingredient_id: id,
        ingredient_name: ing?.name ?? '—',
        unit: ing?.unit ?? '',
        quantity: round3(qty),
        current_stock: round3(available),
        short: qty > available + 1e-9,
      }
    })
    .sort((a, b) => b.quantity - a.quantity)

  return {
    lines,
    cogs: Math.round(theoreticalCogs * 100) / 100,
    any_short: lines.some((l) => l.short),
  }
}
