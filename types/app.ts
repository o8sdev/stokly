import type { Ingredient, Recipe, Supplier, Database } from './database'

// Convenience alias for inserting an append-only stock movement.
export type StockMovementInsert =
  Database['public']['Tables']['stock_movements']['Insert']

// A single computed line inside a recipe cost calculation.
export interface RecipeIngredientLine {
  // Either an ingredient or a sub-recipe backs the line.
  ingredientId: string | null
  subRecipeId: string | null
  quantity: number
  unit: string
  // Effective yield used (override ?? ingredient yield ?? 1).
  yieldPercent: number
  // Resolved cost-per-unit for the backing source.
  costPerUnit: number
  // Computed cost for this line (yield-adjusted).
  cost: number
}

// Ingredient enriched with its derived current stock level.
export interface IngredientWithStock extends Ingredient {
  currentStock: number
  supplierName: string | null
  lastCountAt: string | null
}

// Ingredient enriched with its per-unit custom conversion factors (B4):
// unit → how many BASE units one of that unit equals, e.g. { 'şüşə': 750 } for an
// ml-based ingredient. Attached by getIngredients; consumed by the cost/usage calc.
export type IngredientWithConversions = Ingredient & {
  unit_conversions?: Record<string, number> | null
}

// Recipe enriched with computed cost figures for list/report views.
export interface RecipeWithCost extends Recipe {
  ingredientCount: number
  totalCost: number
  costPerServing: number
  foodCostPercent: number
}

// Editor row state for the recipe builder (client-side, before save).
export interface EditorLine {
  // Stable client-side key for React lists.
  key: string
  kind: 'ingredient' | 'sub_recipe'
  sourceId: string
  quantity: string
  unit: string
  yieldOverride: string
}

export type IngredientOption = Pick<
  Ingredient,
  'id' | 'name' | 'unit' | 'cost_per_unit' | 'yield_percent' | 'supplier_id'
> & {
  // Per-unit custom conversion factors (B4) so the live recipe editor can
  // convert a line's unit to the ingredient's base unit exactly like the
  // server-side cost calc does.
  unit_conversions?: Record<string, number> | null
}

export type SubRecipeOption = {
  id: string
  name: string
  unitCost: number
  serving_unit: string | null
}

export type SupplierOption = Pick<Supplier, 'id' | 'name'>

/* ── Batch expiry / FIFO (migration 003) ──────────────────────────────── */

export type IngredientBatch = {
  id: string
  tenant_id: string
  ingredient_id: string
  supplier_id: string | null
  quantity_received: number
  quantity_remaining: number
  unit: string
  unit_cost: number
  received_date: string
  expiry_date: string | null
  status: 'active' | 'depleted' | 'expired' | 'written_off'
  created_from_movement_id: string | null
  batch_code: string | null
  supplier_lot_no: string | null
  location_id: string | null
  // Joined for display (the location's name); not a column on the batch row.
  location_name?: string | null
  created_at: string
}

export type ExpiringBatch = IngredientBatch & {
  days_remaining: number
  ingredient_name: string
}

export type BatchConsumption = {
  batch_id: string
  quantity_consumed: number
  unit_cost: number
}

/* ── Production runs (migration 003) ───────────────────────────────────── */

export type ProductionRun = {
  id: string
  tenant_id: string
  output_ingredient_id: string
  output_quantity: number
  output_unit: string
  output_batch_expiry: string | null
  output_unit_cost: number | null
  theoretical_yield_percent: number | null
  actual_yield_percent: number | null
  recipe_id: string | null
  produced_by: string | null
  storage_location: string | null
  notes: string | null
  produced_at: string
  created_at: string
}

export type ProductionRunInput = {
  id: string
  production_run_id: string
  ingredient_id: string
  quantity_used: number
  unit: string
  source_batch_id: string | null
  unit_cost_at_time: number
}
