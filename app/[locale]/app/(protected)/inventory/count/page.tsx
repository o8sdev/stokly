import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getIngredients,
  getStockByLocation,
  getStorageLocations,
  getTenant,
} from '@/lib/data/queries'
import { getPreCountInfo } from '@/lib/data/counts'
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

  const [ingredients, byLoc, locations, preCount, tenant] = await Promise.all([
    getIngredients(ctx.tenantId),
    getStockByLocation(ctx.tenantId),
    getStorageLocations(ctx.tenantId),
    getPreCountInfo(ctx.tenantId),
    getTenant(ctx.tenantId),
  ])

  // Per-ingredient current stock keyed by location, so the form shows the
  // on-hand for whichever station the user is counting.
  const byLocMap: Record<string, Record<string, number>> = {}
  for (const s of byLoc) {
    const lid = s.location_id ?? ''
    ;(byLocMap[s.ingredient_id] ??= {})[lid] = s.qty
  }

  const items: CountItem[] = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    byLocation: byLocMap[i.id] ?? {},
  }))

  const locationOptions = locations.map((l) => ({ id: l.id, name: l.name }))
  const defaultLocationId =
    locations.find((l) => l.is_default_consumption)?.id ??
    locations[0]?.id ??
    ''

  return (
    <div>
      <PageHeader title={t('inventory.count')} />
      <CountFlow
        locale={locale}
        items={items}
        preCount={preCount}
        locations={locationOptions}
        defaultLocationId={defaultLocationId}
        blind={!!tenant?.blind_counts}
      />
    </div>
  )
}
