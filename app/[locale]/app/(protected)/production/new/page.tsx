import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ChevronLeft } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getIngredients,
  getRecipes,
  getRecipeIngredients,
  getConsumptionPoints,
} from '@/lib/data/queries'
import { tenantHasFeature } from '@/lib/admin/entitlements'
import { toBaseUnit } from '@/lib/constants/units'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { ProductionForm } from '@/components/production/production-form'

export default async function NewProductionPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)
  const [ingredients, recipes, recipeIngredients, points, multiLocation] =
    await Promise.all([
      getIngredients(ctx.tenantId),
      getRecipes(ctx.tenantId),
      getRecipeIngredients(ctx.tenantId),
      getConsumptionPoints(ctx.tenantId),
      tenantHasFeature(ctx.tenantId, 'multi_location'),
    ])

  // Direct ingredient lines per recipe (used to pre-fill production inputs).
  // Quantities are converted into each ingredient's BASE/stock unit here —
  // execute_production_run deducts stock in that unit, so a "200 q" recipe line
  // on a kq-stocked ingredient must arrive as 0.2, not 200.
  const ingById = new Map(ingredients.map((i) => [i.id, i]))
  const recipeLines: Record<string, { ingredient_id: string; quantity: number }[]> = {}
  for (const l of recipeIngredients) {
    if (!l.ingredient_id) continue
    const ing = ingById.get(l.ingredient_id)
    const qty = ing
      ? toBaseUnit(Number(l.quantity), l.unit, ing.unit, ing.unit_conversions)
      : Number(l.quantity)
    ;(recipeLines[l.recipe_id] ??= []).push({
      ingredient_id: l.ingredient_id,
      quantity: qty,
    })
  }

  // Batch (sub-)recipes with ingredient lines make good production templates.
  const templates = recipes
    .filter((r) => r.is_sub_recipe && (recipeLines[r.id]?.length ?? 0) > 0)
    .map((r) => ({
      id: r.id,
      name: (locale === 'ru' ? r.name_ru : r.name_az) || r.name,
      serving_size: r.serving_size,
      produced_ingredient_id: r.produced_ingredient_id,
    }))

  const ingOpts = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    cost_per_unit: i.cost_per_unit,
  }))

  return (
    <div>
      <PageHeader
        title={t('production.new')}
        description={t('production.subtitle')}
        action={
          <Button asChild variant="outline" className="gap-2">
            <Link href="/app/production">
              <ChevronLeft className="h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
        }
      />
      <ProductionForm
        locale={locale}
        ingredients={ingOpts}
        recipes={templates}
        recipeLines={recipeLines}
        consumptionLocations={points.points}
        defaultConsumptionId={points.defaultId}
        multiLocation={multiLocation}
      />
    </div>
  )
}
