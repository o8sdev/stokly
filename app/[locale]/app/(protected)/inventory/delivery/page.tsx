import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { getIngredients, getSuppliers } from '@/lib/data/queries'
import type { IngredientOption, SupplierOption } from '@/types/app'
import { PageHeader } from '@/components/layout/page-header'
import { DeliveryForm } from '@/components/inventory/delivery-form'

export default async function DeliveryPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const [ingredients, suppliers] = await Promise.all([
    getIngredients(ctx.tenantId),
    getSuppliers(ctx.tenantId),
  ])

  const ingredientOptions: IngredientOption[] = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    cost_per_unit: i.cost_per_unit,
    yield_percent: i.yield_percent,
  }))

  const supplierOptions: SupplierOption[] = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
  }))

  return (
    <div>
      <PageHeader title={t('inventory.delivery')} />
      <DeliveryForm
        locale={locale}
        ingredients={ingredientOptions}
        suppliers={supplierOptions}
      />
    </div>
  )
}
