import type { IngredientOption, SubRecipeOption } from '@/types/app'
import {
  getIngredients,
  getRecipes,
  getRecipeIngredients,
  getStorageLocations,
} from '@/lib/data/queries'
import { tenantHasFeature } from '@/lib/admin/entitlements'
import {
  buildResolveContext,
  subRecipeUnitCost,
} from '@/lib/calculations/recipe-cost'

export interface RecipeBuilderData {
  ingredientOptions: IngredientOption[]
  subRecipeOptions: SubRecipeOption[]
  // Consumption points a recipe can be routed to (multi-location). The default
  // point is listed first; an unset routing falls back to it.
  consumptionLocations: { id: string; name: string }[]
  defaultConsumptionId: string | null
  multiLocation: boolean
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
  const [ingredients, recipes, recipeIngredients, locations, multiLocation] =
    await Promise.all([
      getIngredients(tenantId),
      getRecipes(tenantId),
      getRecipeIngredients(tenantId),
      getStorageLocations(tenantId),
      tenantHasFeature(tenantId, 'multi_location'),
    ])

  const ctx = buildResolveContext(ingredients, recipes, recipeIngredients)

  const ingredientOptions: IngredientOption[] = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    cost_per_unit: i.cost_per_unit,
    yield_percent: i.yield_percent,
    supplier_id: i.supplier_id,
    unit_conversions: i.unit_conversions ?? null,
  }))

  const subRecipeOptions: SubRecipeOption[] = recipes
    .filter((r) => r.is_sub_recipe && r.id !== excludeRecipeId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      unitCost: subRecipeUnitCost(r.id, ctx),
      serving_unit: r.serving_unit,
    }))

  // Default point first, then the rest (consumption points only).
  const points = locations.filter((l) => l.is_consumption_point)
  points.sort((a, b) =>
    a.is_default_consumption === b.is_default_consumption
      ? a.sort_order - b.sort_order
      : a.is_default_consumption
        ? -1
        : 1
  )
  const consumptionLocations = points.map((l) => ({ id: l.id, name: l.name }))
  const defaultConsumptionId =
    locations.find((l) => l.is_default_consumption)?.id ?? null

  return {
    ingredientOptions,
    subRecipeOptions,
    consumptionLocations,
    defaultConsumptionId,
    multiLocation,
  }
}
