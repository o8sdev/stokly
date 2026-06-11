import { createClient } from '@/lib/supabase/server'
import type {
  Ingredient,
  Recipe,
  RecipeCategory,
  RecipeIngredient,
  StockMovement,
  Supplier,
  StorageLocation,
  WasteCategory,
  Tenant,
} from '@/types/database'
import type { IngredientBatch, IngredientWithConversions } from '@/types/app'
import type { GlobalIngredient } from '@/types/database'
import { deriveAllStockLevels } from '@/lib/calculations/stock-level'
import { computeTheoreticalUsage } from '@/lib/calculations/theoretical-usage'
import {
  computeShoppingList,
  type ShoppingItem,
} from '@/lib/calculations/shopping-list'
import {
  computePriceStat,
  type PriceStat,
} from '@/lib/calculations/price-variance'

const round3 = (n: number): number => Math.round(n * 1000) / 1000

// All loaders take an explicit tenantId (resolved via requireTenant) so the
// tenant scope is always server-controlled. RLS provides defence in depth.

export async function getIngredients(
  tenantId: string
): Promise<IngredientWithConversions[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('ingredients')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })
  const ingredients = data ?? []
  if (ingredients.length === 0) return []

  // Attach each ingredient's custom unit conversions (B4) so the cost/usage calc
  // can convert non-metric pack units (case, bottle, …) to the base/stock unit.
  const { data: conv } = await supabase
    .from('ingredient_unit_conversions')
    .select('ingredient_id, unit, factor_to_base')
    .eq('tenant_id', tenantId)
  const byIngredient = new Map<string, Record<string, number>>()
  for (const c of conv ?? []) {
    const m = byIngredient.get(c.ingredient_id) ?? {}
    m[c.unit] = Number(c.factor_to_base)
    byIngredient.set(c.ingredient_id, m)
  }
  return ingredients.map((i) => ({
    ...i,
    unit_conversions: byIngredient.get(i.id) ?? null,
  }))
}

// Production history needed to explode prepped goods back into raw ingredients
// (raw-equivalent view): every run's output + its raw inputs. Inputs carry no
// tenant_id, so they're fetched via the runs' ids.
export async function getProductionComposition(tenantId: string): Promise<{
  runs: { id: string; output_ingredient_id: string; output_quantity: number }[]
  inputs: {
    production_run_id: string
    ingredient_id: string
    quantity_used: number
  }[]
}> {
  const supabase = createClient()
  const { data: runs } = await supabase
    .from('production_runs')
    .select('id, output_ingredient_id, output_quantity')
    .eq('tenant_id', tenantId)
  const runRows = (runs ?? []).map((r) => ({
    id: r.id,
    output_ingredient_id: r.output_ingredient_id,
    output_quantity: Number(r.output_quantity),
  }))
  if (runRows.length === 0) return { runs: [], inputs: [] }

  const { data: inputs } = await supabase
    .from('production_run_inputs')
    .select('production_run_id, ingredient_id, quantity_used')
    .in(
      'production_run_id',
      runRows.map((r) => r.id)
    )
  return {
    runs: runRows,
    inputs: (inputs ?? []).map((i) => ({
      production_run_id: i.production_run_id,
      ingredient_id: i.ingredient_id,
      quantity_used: Number(i.quantity_used),
    })),
  }
}

// Menu sections (breakfast, soups, …) a tenant has defined for its recipes.
export async function getRecipeCategories(
  tenantId: string
): Promise<RecipeCategory[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('recipe_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  return data ?? []
}

// A single ingredient's custom unit conversions (B4), for the editor panel.
export async function getIngredientConversions(
  tenantId: string,
  ingredientId: string
): Promise<{ unit: string; factor_to_base: number }[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('ingredient_unit_conversions')
    .select('unit, factor_to_base')
    .eq('tenant_id', tenantId)
    .eq('ingredient_id', ingredientId)
    .order('unit', { ascending: true })
  return (data ?? []).map((c) => ({
    unit: c.unit,
    factor_to_base: Number(c.factor_to_base),
  }))
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
  // The consumption point this line deducts from (null = tenant default).
  location_name: string | null
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

  const levels = deriveAllStockLevels(movements)
  const ingById = new Map(ingredients.map((i) => [i.id, i]))
  const recipeById = new Map(recipes.map((r) => [r.id, r]))
  const defaultLoc =
    locations.find((l) => l.is_default_consumption)?.id ?? null
  const locName = new Map(locations.map((l) => [l.id, l.name]))

  // Mirror confirm_daily_sales: route each sold dish to its recipe's consumption
  // location (null → default), then check availability AT THAT LOCATION — except
  // count-only ingredients (never batch-tracked), which fall back to the derived
  // total. "Ever batched" keys on any batch row (any status), like the RPC.
  const buckets = new Map<string | null, typeof sold>()
  for (const s of sold) {
    const loc =
      recipeById.get(s.recipe_id)?.consumption_location_id ?? defaultLoc
    const arr = buckets.get(loc) ?? []
    arr.push(s)
    buckets.set(loc, arr)
  }

  const qtyByLoc = new Map<string, Map<string, number>>()
  for (const s of byLoc) {
    if (!s.location_id) continue
    const m = qtyByLoc.get(s.location_id) ?? new Map<string, number>()
    m.set(s.ingredient_id, (m.get(s.ingredient_id) ?? 0) + s.qty)
    qtyByLoc.set(s.location_id, m)
  }
  const { data: batchRows } = await supabase
    .from('ingredient_batches')
    .select('ingredient_id')
    .eq('tenant_id', tenantId)
  const everBatched = new Set((batchRows ?? []).map((r) => r.ingredient_id))

  let cogs = 0
  const lines: DayConfirmPreviewLine[] = []
  for (const [loc, bucketItems] of buckets) {
    const { usageByIngredient, theoreticalCogs } = computeTheoreticalUsage(
      bucketItems,
      ingredients,
      recipes,
      recipeIngredients
    )
    cogs += theoreticalCogs
    for (const [id, qty] of usageByIngredient) {
      if (qty <= 0) continue
      const ing = ingById.get(id)
      const available = everBatched.has(id)
        ? loc
          ? qtyByLoc.get(loc)?.get(id) ?? 0
          : 0
        : levels.get(id) ?? 0
      lines.push({
        ingredient_id: id,
        ingredient_name: ing?.name ?? '—',
        unit: ing?.unit ?? '',
        quantity: round3(qty),
        current_stock: round3(available),
        short: qty > available + 1e-9,
        location_name: loc ? locName.get(loc) ?? null : null,
      })
    }
  }
  lines.sort((a, b) => b.quantity - a.quantity)

  return {
    lines,
    cogs: Math.round(cogs * 100) / 100,
    any_short: lines.some((l) => l.short),
  }
}

export interface ShoppingListGroup {
  supplier_id: string | null
  supplier_name: string | null
  items: ShoppingItem[]
  subtotal: number
}

export interface ShoppingListData {
  groups: ShoppingListGroup[]
  total_est: number
  item_count: number
}

// Build-to-par shopping list, grouped by supplier. "On hand" is the derived
// ingredient-level stock (deriveAllStockLevels); "last cost" is the unit_cost of
// each ingredient's most recent delivery, falling back to its current cost.
export async function getShoppingList(
  tenantId: string
): Promise<ShoppingListData> {
  const [ingredients, movements, suppliers] = await Promise.all([
    getIngredients(tenantId),
    getStockMovements(tenantId),
    getSuppliers(tenantId),
  ])

  const stockLevels = deriveAllStockLevels(movements)

  // Last paid cost per ingredient = unit_cost of its most recent delivery.
  // getStockMovements returns newest-first, so the first delivery seen wins.
  const lastCosts = new Map<string, number>()
  const lastCostAt = new Map<string, number>()
  for (const m of movements) {
    if (m.movement_type !== 'delivery' || m.unit_cost == null) continue
    const ts = new Date(m.created_at).getTime()
    if (ts > (lastCostAt.get(m.ingredient_id) ?? -Infinity)) {
      lastCostAt.set(m.ingredient_id, ts)
      lastCosts.set(m.ingredient_id, Number(m.unit_cost))
    }
  }

  const items = computeShoppingList(ingredients, stockLevels, lastCosts)
  const supMap = new Map(suppliers.map((s) => [s.id, s.name]))

  // Group by supplier; the "no supplier" bucket sorts last.
  const groupMap = new Map<string, ShoppingListGroup>()
  for (const item of items) {
    const key = item.supplier_id ?? ''
    let group = groupMap.get(key)
    if (!group) {
      group = {
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_id
          ? (supMap.get(item.supplier_id) ?? null)
          : null,
        items: [],
        subtotal: 0,
      }
      groupMap.set(key, group)
    }
    group.items.push(item)
    group.subtotal = Math.round((group.subtotal + item.est_cost) * 100) / 100
  }

  const groups = [...groupMap.values()].sort((a, b) => {
    if (!a.supplier_id) return 1
    if (!b.supplier_id) return -1
    return (a.supplier_name ?? '').localeCompare(b.supplier_name ?? '')
  })

  const total_est =
    Math.round(items.reduce((s, i) => s + i.est_cost, 0) * 100) / 100

  return { groups, total_est, item_count: items.length }
}

// Per-ingredient price stats (last cost + moving average of recent deliveries),
// keyed by ingredient_id. Powers the receiving price-variance chip on the
// purchase form. Built from delivery movements (newest first).
export async function getIngredientPriceStats(
  tenantId: string
): Promise<Record<string, PriceStat>> {
  const supabase = createClient()
  const { data } = await supabase
    .from('stock_movements')
    .select('ingredient_id, unit_cost, created_at')
    .eq('tenant_id', tenantId)
    .eq('movement_type', 'delivery')
    .not('unit_cost', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5000)

  const byIngredient = new Map<string, number[]>()
  for (const row of data ?? []) {
    if (row.unit_cost == null) continue
    const costs = byIngredient.get(row.ingredient_id) ?? []
    costs.push(Number(row.unit_cost))
    byIngredient.set(row.ingredient_id, costs)
  }

  const stats: Record<string, PriceStat> = {}
  for (const [id, costs] of byIngredient) stats[id] = computePriceStat(costs)
  return stats
}

export interface PriceHistoryEntry {
  id: string
  created_at: string
  supplier_name: string | null
  quantity: number
  unit_cost: number
}

// Delivery price history for one ingredient (newest first) + its price stat.
// Powers the price-history panel on the ingredient detail page.
export async function getIngredientPriceHistory(
  tenantId: string,
  ingredientId: string
): Promise<{ entries: PriceHistoryEntry[]; stat: PriceStat }> {
  const supabase = createClient()
  const [delRes, suppliers] = await Promise.all([
    supabase
      .from('stock_movements')
      .select('id, unit_cost, supplier_id, quantity, created_at')
      .eq('tenant_id', tenantId)
      .eq('ingredient_id', ingredientId)
      .eq('movement_type', 'delivery')
      .not('unit_cost', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100),
    getSuppliers(tenantId),
  ])

  const supMap = new Map(suppliers.map((s) => [s.id, s.name]))
  const entries: PriceHistoryEntry[] = (delRes.data ?? []).map((d) => ({
    id: d.id,
    created_at: d.created_at,
    supplier_name: d.supplier_id ? (supMap.get(d.supplier_id) ?? null) : null,
    quantity: Number(d.quantity),
    unit_cost: Number(d.unit_cost ?? 0),
  }))

  const stat = computePriceStat(entries.map((e) => e.unit_cost))
  return { entries, stat }
}

// Units sold per recipe over a date range (inclusive), from itemized daily sales.
// Powers menu engineering (sales mix). Mirrors the period report's sold-items query.
export async function getSalesMix(
  tenantId: string,
  from: string,
  to: string
): Promise<Map<string, number>> {
  const supabase = createClient()
  const { data: sales } = await supabase
    .from('daily_sales')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('sale_date', from)
    .lte('sale_date', to)
  const ids = (sales ?? []).map((r) => r.id)
  const mix = new Map<string, number>()
  if (ids.length === 0) return mix
  const { data: items } = await supabase
    .from('daily_sales_items')
    .select('recipe_id, quantity')
    .in('daily_sales_id', ids)
    // Sales mix = PAID units; comps are consumption, not sales.
    .eq('is_comp', false)
  for (const it of items ?? []) {
    mix.set(it.recipe_id, (mix.get(it.recipe_id) ?? 0) + Number(it.quantity))
  }
  return mix
}

// The tenant's consumption points (where sales/waste/production deduct), default
// point first. Powers the location selectors on the waste + production forms.
export async function getConsumptionPoints(
  tenantId: string
): Promise<{ points: { id: string; name: string }[]; defaultId: string | null }> {
  const locs = await getStorageLocations(tenantId)
  const points = locs.filter((l) => l.is_consumption_point)
  points.sort((a, b) =>
    a.is_default_consumption === b.is_default_consumption
      ? a.sort_order - b.sort_order
      : a.is_default_consumption
        ? -1
        : 1
  )
  return {
    points: points.map((l) => ({ id: l.id, name: l.name })),
    defaultId: locs.find((l) => l.is_default_consumption)?.id ?? null,
  }
}

export interface LocationReportRow {
  id: string
  name: string
  kind: string | null
  is_consumption_point: boolean
  stock_value: number
  sales_value: number
  waste_value: number
}

// Per-location report (multi_location): current stock value per location + the
// period's sales COGS and waste value attributed to each consumption point
// (from the from_location_id stamped on sale/waste movements).
export async function getLocationReport(
  tenantId: string,
  from: string,
  to: string
): Promise<LocationReportRow[]> {
  const supabase = createClient()
  const fromStart = `${from}T00:00:00.000Z`
  const toEnd = `${to}T23:59:59.999Z`
  const [locsRes, batchesRes, movesRes] = await Promise.all([
    supabase
      .from('storage_locations')
      .select('id, name, kind, is_consumption_point')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('ingredient_batches')
      .select('location_id, quantity_remaining, unit_cost')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .gt('quantity_remaining', 0),
    supabase
      .from('stock_movements')
      .select('from_location_id, movement_type, quantity, unit_cost')
      .eq('tenant_id', tenantId)
      .in('movement_type', ['sale', 'waste'])
      .gte('created_at', fromStart)
      .lte('created_at', toEnd),
  ])

  const stockVal = new Map<string, number>()
  for (const b of batchesRes.data ?? []) {
    if (!b.location_id) continue
    stockVal.set(
      b.location_id,
      (stockVal.get(b.location_id) ?? 0) +
        Number(b.quantity_remaining) * Number(b.unit_cost)
    )
  }
  const salesVal = new Map<string, number>()
  const wasteVal = new Map<string, number>()
  for (const m of movesRes.data ?? []) {
    if (!m.from_location_id) continue
    const v = Math.abs(Number(m.quantity)) * Number(m.unit_cost ?? 0)
    const tgt = m.movement_type === 'sale' ? salesVal : wasteVal
    tgt.set(m.from_location_id, (tgt.get(m.from_location_id) ?? 0) + v)
  }

  return (locsRes.data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    kind: l.kind,
    is_consumption_point: l.is_consumption_point,
    stock_value: round3(stockVal.get(l.id) ?? 0),
    sales_value: round3(salesVal.get(l.id) ?? 0),
    waste_value: round3(wasteVal.get(l.id) ?? 0),
  }))
}
