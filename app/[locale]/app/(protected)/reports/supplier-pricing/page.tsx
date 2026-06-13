import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getPurchaseLog,
  getStockMovements,
  getIngredients,
  getRecipes,
  getRecipeIngredients,
  getTenant,
} from '@/lib/data/queries'
import {
  resolveRange,
  RANGE_PRESETS,
  type RangePreset,
} from '@/lib/data/overview'
import {
  buildSupplierComparison,
  buildAllTrends,
  buildPriceAlerts,
} from '@/lib/calculations/supplier-pricing'
import {
  buildPriceChanges,
  buildFoodCostRows,
} from '@/lib/calculations/food-cost-monitor'
import { PageHeader } from '@/components/layout/page-header'
import { RangeSelector } from '@/components/dashboard/range-selector'
import {
  SupplierPricingView,
  type PriceAlertVM,
} from '@/components/reports/supplier-pricing-view'

export default async function SupplierPricingPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { range?: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations('reports')
  const ctx = await requireTenant(locale)

  const preset: RangePreset = RANGE_PRESETS.includes(
    searchParams.range as RangePreset
  )
    ? (searchParams.range as RangePreset)
    : 'this_month'
  const range = resolveRange(preset)

  const [purchases, movements, ingredients, recipes, recipeIngredients, tenant] =
    await Promise.all([
      getPurchaseLog(ctx.tenantId, range.from, range.to),
      getStockMovements(ctx.tenantId),
      getIngredients(ctx.tenantId),
      getRecipes(ctx.tenantId),
      getRecipeIngredients(ctx.tenantId),
      getTenant(ctx.tenantId),
    ])

  // Supplier comparison is period-scoped; the trend is all-time (seasonality),
  // built from every delivery movement.
  const comparison = buildSupplierComparison(purchases)
  const deliveryRows = movements
    .filter((m) => m.movement_type === 'delivery' && m.unit_cost != null)
    .map((m) => ({
      ingredient_id: m.ingredient_id,
      unit_cost: Number(m.unit_cost),
      quantity: Number(m.quantity),
      created_at: m.created_at,
    }))
  const trends = buildAllTrends(deliveryRows)
  const trendNames: Record<string, string> = Object.fromEntries(
    ingredients.map((i) => [i.id, i.name])
  )

  // Price-rise alerts (all-time moving avg), annotated with any over-target
  // dishes that use the ingredient — closing the loop from a price rise to the
  // food-cost impact.
  const alerts = buildPriceAlerts(
    movements,
    ingredients.map((i) => ({ id: i.id, name: i.name, unit: i.unit }))
  )
  const priceChanges = buildPriceChanges(ingredients, movements)
  const fcRows = buildFoodCostRows(
    ingredients,
    recipes,
    recipeIngredients,
    priceChanges,
    tenant?.default_food_cost_target ?? 30
  )
  const overTarget = new Set(
    fcRows.filter((r) => r.status === 'over').map((r) => r.id)
  )
  const recipeNameById = new Map(recipes.map((r) => [r.id, r.name]))
  const affectedByIng = new Map<string, string[]>()
  for (const ri of recipeIngredients) {
    if (!ri.ingredient_id || !overTarget.has(ri.recipe_id)) continue
    const arr = affectedByIng.get(ri.ingredient_id) ?? []
    const nm = recipeNameById.get(ri.recipe_id)
    if (nm && !arr.includes(nm)) arr.push(nm)
    affectedByIng.set(ri.ingredient_id, arr)
  }
  const alertVMs: PriceAlertVM[] = alerts.map((a) => ({
    ...a,
    affectedDishes: affectedByIng.get(a.ingredientId) ?? [],
  }))

  return (
    <div>
      <PageHeader
        title={t('supplier_pricing')}
        description={t('supplier_pricing_desc')}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {range.from} — {range.to}
        </p>
        <RangeSelector />
      </div>
      <SupplierPricingView
        alerts={alertVMs}
        comparison={comparison}
        trends={trends}
        trendNames={trendNames}
      />
    </div>
  )
}
