import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { getIngredients, getWasteCategories } from '@/lib/data/queries'
import type { IngredientOption } from '@/types/app'
import { PageHeader } from '@/components/layout/page-header'
import { WasteForm } from '@/components/inventory/waste-form'

export default async function WastePage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const [ingredients, categories] = await Promise.all([
    getIngredients(ctx.tenantId),
    getWasteCategories(ctx.tenantId),
  ])

  const ingredientOptions: IngredientOption[] = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    cost_per_unit: i.cost_per_unit,
    yield_percent: i.yield_percent,
  }))

  // ISO date (yyyy-mm-dd) for the date input default. Computed on the server
  // request; the page is dynamic so this is the current day.
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <PageHeader title={t('inventory.waste')} />
      <WasteForm
        locale={locale}
        defaultDate={today}
        ingredients={ingredientOptions}
        categories={categories}
      />
    </div>
  )
}
