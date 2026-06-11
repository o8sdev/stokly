import type { Recipe, RecipeIngredient } from '@/types/database'
import type { IngredientWithConversions } from '@/types/app'
import { buildResolveContext } from './recipe-cost'
import { toBaseUnit } from '@/lib/constants/units'

// ── Theoretical usage ────────────────────────────────────────────────────
// Given what was sold (menu item → quantity), explode each sold recipe into the
// raw ingredient quantities it SHOULD have consumed, applying prep yield the
// same way costing does (raw = needed / yield) and recursing through
// sub-recipes (normalized by their serving_size). The result is the "book"
// usage the period report compares against the physical count, so over-
// portioning / waste / theft surface as variance.

type Ctx = ReturnType<typeof buildResolveContext>

export interface SoldItem {
  recipe_id: string
  quantity: number
}

export interface TheoreticalUsage {
  /** ingredient_id → expected base-unit quantity depleted over the period. */
  usageByIngredient: Map<string, number>
  /** Σ expected_qty × ingredient.cost_per_unit (theoretical COGS). */
  theoreticalCogs: number
}

function explode(
  recipeId: string,
  qty: number,
  ctx: Ctx,
  acc: Map<string, number>,
  visited: Set<string>
): void {
  if (qty <= 0 || visited.has(recipeId)) return // qty/cycle guard
  visited.add(recipeId)

  const lines = ctx.linesByRecipe.get(recipeId) ?? []
  for (const line of lines) {
    if (line.ingredient_id) {
      const ing = ctx.ingredients.get(line.ingredient_id)
      const rawYield = line.yield_override ?? ing?.yield_percent ?? 1
      const y = rawYield > 0 && rawYield <= 1 ? rawYield : 1
      // Convert the line quantity into the ingredient's base/stock unit so the
      // depleted quantity matches how stock is tracked.
      const baseQty = ing
        ? toBaseUnit(line.quantity, line.unit, ing.unit, ing.unit_conversions)
        : line.quantity
      const consumed = (qty * baseQty) / y
      acc.set(
        line.ingredient_id,
        (acc.get(line.ingredient_id) ?? 0) + consumed
      )
    } else if (line.sub_recipe_id) {
      const sub = ctx.recipes.get(line.sub_recipe_id)
      if (sub?.produced_ingredient_id) {
        // STOCKED prep (Yarımfabrikat): the raw was consumed at production time,
        // so a sale deducts the PREP's own stock — stop here, don't recurse.
        acc.set(
          sub.produced_ingredient_id,
          (acc.get(sub.produced_ingredient_id) ?? 0) + qty * line.quantity
        )
      } else {
        // MADE-TO-ORDER: explode to raw. A lossy batch (yield < 1) must be made
        // in greater quantity to yield the same servings, so it consumes more raw.
        const size =
          sub?.serving_size && sub.serving_size > 0 ? sub.serving_size : 1
        const yieldP =
          sub?.yield_percent != null && sub.yield_percent > 0
            ? sub.yield_percent
            : 1
        // Fresh visited copy so sibling branches don't share.
        explode(
          line.sub_recipe_id,
          (qty * line.quantity) / (size * yieldP),
          ctx,
          acc,
          new Set(visited)
        )
      }
    }
  }
}

export function computeTheoreticalUsage(
  soldItems: SoldItem[],
  ingredients: IngredientWithConversions[],
  recipes: Recipe[],
  recipeIngredients: RecipeIngredient[]
): TheoreticalUsage {
  const ctx = buildResolveContext(ingredients, recipes, recipeIngredients)
  const acc = new Map<string, number>()
  for (const item of soldItems) {
    explode(item.recipe_id, item.quantity, ctx, acc, new Set())
  }

  let theoreticalCogs = 0
  for (const [ingredientId, qty] of acc) {
    const ing = ctx.ingredients.get(ingredientId)
    theoreticalCogs += qty * (ing?.cost_per_unit ?? 0)
  }

  return { usageByIngredient: acc, theoreticalCogs }
}
