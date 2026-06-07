import type { Ingredient, Recipe, Supplier } from './database'

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
  'id' | 'name' | 'unit' | 'cost_per_unit' | 'yield_percent'
>

export type SubRecipeOption = {
  id: string
  name: string
  unitCost: number
  serving_unit: string | null
}

export type SupplierOption = Pick<Supplier, 'id' | 'name'>
