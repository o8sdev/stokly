import type {
  Ingredient,
  Recipe,
  RecipeIngredient,
} from '@/types/database'
import type { RecipeWithCost } from '@/types/app'
import { ingredientLineCost, foodCostPercent } from './food-cost'
import { toBaseUnit } from '@/lib/constants/units'

interface ResolveContext {
  ingredients: Map<string, Ingredient>
  recipes: Map<string, Recipe>
  // recipe_id -> its component lines
  linesByRecipe: Map<string, RecipeIngredient[]>
}

// Resolve the full cost of a recipe, recursively costing any sub-recipe
// components. Guards against cyclic sub-recipe references with a visited set.
export function resolveRecipeCost(
  recipeId: string,
  ctx: ResolveContext,
  visited: Set<string> = new Set()
): number {
  if (visited.has(recipeId)) return 0 // cycle guard
  visited.add(recipeId)

  const lines = ctx.linesByRecipe.get(recipeId) ?? []
  let total = 0

  for (const line of lines) {
    if (line.ingredient_id) {
      const ingredient = ctx.ingredients.get(line.ingredient_id)
      if (!ingredient) continue
      const yieldPercent =
        line.yield_override ?? ingredient.yield_percent ?? 1
      // Convert the line's quantity into the ingredient's base/stock unit (the
      // unit cost_per_unit is expressed in) before costing.
      const baseQty = toBaseUnit(line.quantity, line.unit, ingredient.unit)
      total += ingredientLineCost(
        baseQty,
        ingredient.cost_per_unit,
        yieldPercent
      )
    } else if (line.sub_recipe_id) {
      // Cost of one unit of the sub-recipe multiplied by the quantity used.
      const subUnitCost = subRecipeUnitCost(
        line.sub_recipe_id,
        ctx,
        new Set(visited)
      )
      total += subUnitCost * line.quantity
    }
  }

  return total
}

// Cost of a single serving-unit of a sub-recipe. If the sub-recipe defines a
// serving_size we divide the full batch cost by it so callers can multiply by
// the quantity they consume; otherwise the whole recipe is treated as one unit.
export function subRecipeUnitCost(
  recipeId: string,
  ctx: ResolveContext,
  visited: Set<string> = new Set()
): number {
  const recipe = ctx.recipes.get(recipeId)
  const batchCost = resolveRecipeCost(recipeId, ctx, visited)
  const size = recipe?.serving_size ?? null
  if (size && size > 0) return batchCost / size
  return batchCost
}

// Build the ResolveContext maps from flat arrays.
export function buildResolveContext(
  ingredients: Ingredient[],
  recipes: Recipe[],
  recipeIngredients: RecipeIngredient[]
): ResolveContext {
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]))
  const recipeMap = new Map(recipes.map((r) => [r.id, r]))
  const linesByRecipe = new Map<string, RecipeIngredient[]>()
  for (const line of recipeIngredients) {
    const arr = linesByRecipe.get(line.recipe_id) ?? []
    arr.push(line)
    linesByRecipe.set(line.recipe_id, arr)
  }
  return {
    ingredients: ingredientMap,
    recipes: recipeMap,
    linesByRecipe,
  }
}

// Compute cost figures for every recipe in one pass. Used by the recipe list,
// food-cost report and dashboard average.
export function computeRecipesWithCost(
  ingredients: Ingredient[],
  recipes: Recipe[],
  recipeIngredients: RecipeIngredient[]
): RecipeWithCost[] {
  const ctx = buildResolveContext(ingredients, recipes, recipeIngredients)

  return recipes.map((recipe) => {
    const lines = ctx.linesByRecipe.get(recipe.id) ?? []
    const totalCost = resolveRecipeCost(recipe.id, ctx)
    const perServing =
      recipe.serving_size && recipe.serving_size > 0
        ? totalCost / recipe.serving_size
        : totalCost
    const percent = recipe.sale_price
      ? foodCostPercent(totalCost, recipe.sale_price)
      : 0
    return {
      ...recipe,
      ingredientCount: lines.length,
      totalCost,
      costPerServing: perServing,
      foodCostPercent: percent,
    }
  })
}

// Average food-cost percentage across recipes that have a sale price set.
export function averageFoodCostPercent(rows: RecipeWithCost[]): number {
  const priced = rows.filter(
    (r) => !r.is_sub_recipe && r.sale_price && r.sale_price > 0
  )
  if (priced.length === 0) return 0
  const sum = priced.reduce((acc, r) => acc + r.foodCostPercent, 0)
  return sum / priced.length
}
