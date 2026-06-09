import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Plus, Upload } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import { tenantHasFeature } from '@/lib/admin/entitlements'
import {
  getIngredients,
  getSuppliers,
  getStockMovements,
  getCommonLibrary,
  getTenant,
} from '@/lib/data/queries'
import {
  deriveAllStockLevels,
  lastCountDate,
} from '@/lib/calculations/stock-level'
import type { IngredientWithStock } from '@/types/app'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { IngredientTable } from '@/components/ingredients/ingredient-table'
import { QuickAdd } from '@/components/ingredients/quick-add'

export default async function IngredientsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const tenant = await getTenant(ctx.tenantId)
  const [ingredients, suppliers, movements, common] = await Promise.all([
    getIngredients(ctx.tenantId),
    getSuppliers(ctx.tenantId),
    getStockMovements(ctx.tenantId),
    getCommonLibrary(tenant?.business_type ?? null),
  ])

  const [canImport, canLibrary] = await Promise.all([
    tenantHasFeature(ctx.tenantId, 'bulk_import'),
    tenantHasFeature(ctx.tenantId, 'ingredient_library'),
  ])
  // Common basics the tenant hasn't added yet (matched by name).
  const have = new Set(ingredients.map((i) => i.name.trim().toLowerCase()))
  const commonItems = canLibrary
    ? common.filter((g) => !have.has(g.name_az.trim().toLowerCase()))
    : []
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
          <div className="flex flex-wrap gap-2">
            {canImport && (
              <Button asChild variant="outline" className="gap-2">
                <Link href="/app/ingredients/import">
                  <Upload className="h-4 w-4" />
                  {t('ingredients.import_button')}
                </Link>
              </Button>
            )}
            <Button asChild className="gap-2">
              <Link href="/app/ingredients/new">
                <Plus className="h-4 w-4" />
                {t('ingredients.add')}
              </Link>
            </Button>
          </div>
        }
      />
      <QuickAdd locale={locale} items={commonItems} />
      <IngredientTable locale={locale} rows={rows} />
    </div>
  )
}
