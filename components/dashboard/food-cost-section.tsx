import {
  getRecipes,
  getIngredients,
  getRecipeIngredients,
  getStockMovements,
  getTenant,
} from '@/lib/data/queries'
import {
  buildPriceChanges,
  buildFoodCostRows,
} from '@/lib/calculations/food-cost-monitor'
import { FoodCostMonitor } from './food-cost-monitor'

// Streamed dashboard section: recipe food-cost monitor. Reuses request-cached
// loaders (getRecipes/getIngredients/getRecipeIngredients/getStockMovements are
// React-cached, so this adds no extra DB round-trips when the rest of the
// dashboard already pulled them).
export async function FoodCostSection({ tenantId }: { tenantId: string }) {
  const [recipes, ingredients, recipeIngredients, movements, tenant] =
    await Promise.all([
      getRecipes(tenantId),
      getIngredients(tenantId),
      getRecipeIngredients(tenantId),
      getStockMovements(tenantId),
      getTenant(tenantId),
    ])

  const priceChanges = buildPriceChanges(ingredients, movements)
  const defaultTarget = tenant?.default_food_cost_target ?? 30
  const rows = buildFoodCostRows(
    ingredients,
    recipes,
    recipeIngredients,
    priceChanges,
    defaultTarget
  )

  return (
    <div className="mt-4">
      <FoodCostMonitor rows={rows} />
    </div>
  )
}
