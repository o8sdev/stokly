import { setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getSuppliers,
  getIngredients,
  getStorageLocations,
  getRecipes,
  getStockMovements,
} from '@/lib/data/queries'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

// First-run guided setup. Resumable — every step's "done" state is derived from
// real data, so leaving and returning never loses progress.
export default async function OnboardingPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const ctx = await requireTenant(locale)

  const [suppliers, ingredients, locations, recipes, movements] =
    await Promise.all([
      getSuppliers(ctx.tenantId),
      getIngredients(ctx.tenantId),
      getStorageLocations(ctx.tenantId),
      getRecipes(ctx.tenantId),
      getStockMovements(ctx.tenantId),
    ])

  const salesPoints = locations
    .filter((l) => l.is_consumption_point)
    .map((l) => ({
      id: l.id,
      name: l.name,
      isDefault: l.is_default_consumption,
    }))
  const warehouse = locations.find((l) => l.is_default_receiving) ?? null
  const dishes = recipes.filter((r) => !r.is_sub_recipe)
  const hasStock = movements.some(
    (m) => m.movement_type === 'count' || m.movement_type === 'delivery'
  )

  return (
    <OnboardingWizard
      locale={locale}
      suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      ingredients={ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
      }))}
      salesPoints={salesPoints}
      warehouseName={warehouse?.name ?? null}
      recipeNames={dishes.map((r) => r.name)}
      hasStock={hasStock}
    />
  )
}
