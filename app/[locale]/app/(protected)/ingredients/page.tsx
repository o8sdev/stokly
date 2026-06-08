import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Plus } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getIngredients,
  getSuppliers,
  getStockMovements,
} from '@/lib/data/queries'
import {
  deriveAllStockLevels,
  lastCountDate,
} from '@/lib/calculations/stock-level'
import type { IngredientWithStock } from '@/types/app'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { IngredientTable } from '@/components/ingredients/ingredient-table'

export default async function IngredientsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const [ingredients, suppliers, movements] = await Promise.all([
    getIngredients(ctx.tenantId),
    getSuppliers(ctx.tenantId),
    getStockMovements(ctx.tenantId),
  ])

  const levels = deriveAllStockLevels(movements)
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]))

  const rows: IngredientWithStock[] = ingredients.map((i) => ({
    ...i,
    currentStock: levels.get(i.id) ?? 0,
    supplierName: i.supplier_id
      ? supplierName.get(i.supplier_id) ?? null
      : null,
    lastCountAt: lastCountDate(movements, i.id),
  }))

  return (
    <div>
      <PageHeader
        title={t('ingredients.title')}
        action={
          <Button asChild className="gap-2">
            <Link href="/app/ingredients/new">
              <Plus className="h-4 w-4" />
              {t('ingredients.add')}
            </Link>
          </Button>
        }
      />
      <IngredientTable locale={locale} rows={rows} />
    </div>
  )
}
