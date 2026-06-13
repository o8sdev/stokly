import type { Recipe, RecipeIngredient, StockMovement } from '@/types/database'
import type { IngredientWithConversions } from '@/types/app'
import { buildResolveContext, subRecipeUnitCost } from './recipe-cost'
import { ingredientLineCost, foodCostPercent } from './food-cost'
import { toBaseUnit } from '@/lib/constants/units'

// Per-ingredient previous vs current unit cost. CURRENT is the live
// cost_per_unit (what drives recipe cost); PREVIOUS is the most recent delivery
// price that DIFFERS from current — i.e. the price before the last change.
export interface PriceChange {
  prev: number | null
  curr: number
}

export function buildPriceChanges(
  ingredients: { id: string; cost_per_unit: number }[],
  movements: StockMovement[]
): Map<string, PriceChange> {
  // Delivery prices grouped per ingredient, newest-first (getStockMovements
  // already orders by created_at desc).
  const byIng = new Map<string, number[]>()
  for (const m of movements) {
    if (m.movement_type !== 'delivery' || m.unit_cost == null) continue
    const arr = byIng.get(m.ingredient_id) ?? []
    arr.push(Number(m.unit_cost))
    byIng.set(m.ingredient_id, arr)
  }
  const out = new Map<string, PriceChange>()
  for (const ing of ingredients) {
    const curr = ing.cost_per_unit ?? 0
    const prices = byIng.get(ing.id) ?? []
    const prev = prices.find((p) => Math.abs(p - curr) > 1e-9) ?? null
    out.set(ing.id, { prev, curr })
  }
  return out
}

export interface FoodCostIngredientRow {
  name: string
  unit: string
  prevUnit: number | null
  currUnit: number
  deltaPct: number | null // (curr − prev) / prev × 100; null when no prior price
  lineCost: number // this line's contribution to the dish's per-serving cost
}

export type FoodCostStatus = 'over' | 'near' | 'under'

export interface FoodCostRecipeRow {
  id: string
  name: string
  salePrice: number
  costPerServing: number
  foodCostPercent: number
  target: number
  discrepancy: number // foodCostPercent − target (positive = over the limit)
  status: FoodCostStatus
  ingredients: FoodCostIngredientRow[]
}

// "Near" the limit if within this many points under it.
const NEAR_BAND = 5

function statusFor(foodCostPercent: number, target: number): FoodCostStatus {
  if (foodCostPercent > target + 1e-9) return 'over'
  if (foodCostPercent >= target - NEAR_BAND) return 'near'
  return 'under'
}

// Build the dashboard food-cost rows: each priced dish with its current food
// cost %, its target (recipe override → tenant default), the discrepancy, and a
// per-ingredient breakdown of previous→current cost. Sub-recipe lines are
// included with their rolled-up unit cost (no delivery price history).
export function buildFoodCostRows(
  ingredients: IngredientWithConversions[],
  recipes: Recipe[],
  recipeIngredients: RecipeIngredient[],
  priceChanges: Map<string, PriceChange>,
  defaultTarget: number
): FoodCostRecipeRow[] {
  const ctx = buildResolveContext(ingredients, recipes, recipeIngredients)
  const rows: FoodCostRecipeRow[] = []

  for (const recipe of recipes) {
    if (recipe.is_sub_recipe) continue
    const salePrice = recipe.sale_price ?? 0
    if (salePrice <= 0) continue // food-cost % is meaningless without a price

    const size = recipe.serving_size && recipe.serving_size > 0 ? recipe.serving_size : 1
    const lines = ctx.linesByRecipe.get(recipe.id) ?? []

    const ingRows: FoodCostIngredientRow[] = []
    let totalCost = 0

    for (const line of lines) {
      if (line.ingredient_id) {
        const ing = ctx.ingredients.get(line.ingredient_id)
        if (!ing) continue
        const yieldP = line.yield_override ?? ing.yield_percent ?? 1
        const baseQty = toBaseUnit(
          line.quantity,
          line.unit,
          ing.unit,
          ing.unit_conversions
        )
        const pc = priceChanges.get(ing.id)
        const currUnit = ing.cost_per_unit ?? 0
        const prevUnit = pc?.prev ?? null
        const fullCost = ingredientLineCost(baseQty, currUnit, yieldP)
        totalCost += fullCost
        ingRows.push({
          name: ing.name,
          unit: ing.unit,
          prevUnit,
          currUnit,
          deltaPct:
            prevUnit && prevUnit > 0
              ? ((currUnit - prevUnit) / prevUnit) * 100
              : null,
          lineCost: fullCost / size,
        })
      } else if (line.sub_recipe_id) {
        const sub = ctx.recipes.get(line.sub_recipe_id)
        const prep = sub?.produced_ingredient_id
          ? ctx.ingredients.get(sub.produced_ingredient_id)
          : null
        const unit =
          prep && prep.cost_per_unit > 0
            ? prep.cost_per_unit
            : subRecipeUnitCost(line.sub_recipe_id, ctx, new Set())
        const fullCost = unit * line.quantity
        totalCost += fullCost
        ingRows.push({
          name: sub?.name ?? '—',
          unit: sub?.serving_unit ?? '',
          prevUnit: null,
          currUnit: unit,
          deltaPct: null,
          lineCost: fullCost / size,
        })
      }
    }

    const costPerServing = totalCost / size
    const percent = foodCostPercent(costPerServing, salePrice)
    const target = recipe.target_food_cost_percent ?? defaultTarget
    ingRows.sort((a, b) => b.lineCost - a.lineCost)

    rows.push({
      id: recipe.id,
      name: recipe.name,
      salePrice,
      costPerServing,
      foodCostPercent: percent,
      target,
      discrepancy: percent - target,
      status: statusFor(percent, target),
      ingredients: ingRows,
    })
  }

  // Worst offenders first (most over the limit).
  rows.sort((a, b) => b.discrepancy - a.discrepancy)
  return rows
}
