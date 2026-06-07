import type { IngredientOption, SubRecipeOption } from '@/types/app'
import {
  getIngredients,
  getRecipes,
  getRecipeIngredients,
} from '@/lib/data/queries'
import {
  buildResolveContext,
  subRecipeUnitCost,
} from '@/lib/calculations/recipe-cost'

export interface RecipeBuilderData {
  ingredientOptions: IngredientOption[]
  subRecipeOptions: SubRecipeOption[]
}

// Load and pre-cost the options shown in the recipe builder. Sub-recipe unit
// costs are resolved server-side (recursively) and passed to the client so the
// live editor can multiply by quantity without refetching.
//
// `excludeRecipeId` removes the recipe currently being edited from the
// sub-recipe options to prevent a recipe referencing itself.
export async function getRecipeBuilderData(
  tenantId: string,
  excludeRecipeId?: string
): Promise<RecipeBuilderData> {
  const [ingredients, recipes, recipeIngredients] = await Promise.all([
    getIngredients(tenantId),
    getRecipes(tenantId),
    getRecipeIngredients(tenantId),
  ])

  const ctx = buildResolveContext(ingredients, recipes, recipeIngredients)

  const ingredientOptions: IngredientOption[] = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    cost_per_unit: i.cost_per_unit,
    yield_percent: i.yield_percent,
  }))

  const subRecipeOptions: SubRecipeOption[] = recipes
    .filter((r) => r.is_sub_recipe && r.id !== excludeRecipeId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      unitCost: subRecipeUnitCost(r.id, ctx),
      serving_unit: r.serving_unit,
    }))

  return { ingredientOptions, subRecipeOptions }
}
