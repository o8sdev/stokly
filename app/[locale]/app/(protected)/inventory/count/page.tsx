import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { getIngredients, getStockMovements } from '@/lib/data/queries'
import { getPreCountInfo } from '@/lib/data/counts'
import { deriveAllStockLevels } from '@/lib/calculations/stock-level'
import { PageHeader } from '@/components/layout/page-header'
import { CountFlow } from '@/components/inventory/count-flow'
import type { CountItem } from '@/components/inventory/stock-count-form'

export default async function StockCountPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const [ingredients, movements, preCount] = await Promise.all([
    getIngredients(ctx.tenantId),
    getStockMovements(ctx.tenantId),
    getPreCountInfo(ctx.tenantId),
  ])

  const levels = deriveAllStockLevels(movements)
  const items: CountItem[] = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    currentStock: levels.get(i.id) ?? 0,
  }))

  return (
    <div>
      <PageHeader title={t('inventory.count')} />
      <CountFlow locale={locale} items={items} preCount={preCount} />
    </div>
  )
}
