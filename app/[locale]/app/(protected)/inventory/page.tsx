import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ClipboardList, ArrowLeftRight } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getIngredients,
  getStockMovements,
  getActiveBatches,
  getStorageLocations,
  getStockByLocation,
} from '@/lib/data/queries'
import {
  deriveAllStockLevels,
  lastCountDate,
} from '@/lib/calculations/stock-level'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState, type StockStatus } from '@/components/ui/stokly-theme'
import {
  InventoryTable,
  type InventoryRow,
} from '@/components/inventory/inventory-table'

export default async function InventoryPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const [ingredients, movements, batches, locations, byLoc] = await Promise.all([
    getIngredients(ctx.tenantId),
    getStockMovements(ctx.tenantId),
    getActiveBatches(ctx.tenantId),
    getStorageLocations(ctx.tenantId),
    getStockByLocation(ctx.tenantId),
  ])

  const levels = deriveAllStockLevels(movements)
  const locName = new Map(locations.map((l) => [l.id, l.name]))
  const locOrder = new Map(locations.map((l, idx) => [l.id, idx]))

  // Group active batches by ingredient (already FIFO-ordered by query).
  const batchesByIngredient = new Map<string, typeof batches>()
  for (const b of batches) {
    const arr = batchesByIngredient.get(b.ingredient_id) ?? []
    arr.push(b)
    batchesByIngredient.set(b.ingredient_id, arr)
  }

  // Per-ingredient stock split by location (sorted by the locations' own order).
  const breakdownByIngredient = new Map<string, { name: string; qty: number }[]>()
  for (const s of byLoc) {
    const arr = breakdownByIngredient.get(s.ingredient_id) ?? []
    arr.push({ name: locName.get(s.location_id ?? '') ?? '—', qty: s.qty })
    breakdownByIngredient.set(s.ingredient_id, arr)
  }
  for (const [, arr] of breakdownByIngredient) {
    arr.sort((a, b) => a.name.localeCompare(b.name))
  }

  const rows: InventoryRow[] = ingredients.map((i) => {
    const stock = levels.get(i.id) ?? 0
    const threshold = i.low_stock_threshold
    let status: StockStatus = 'ok'
    if (stock <= 0) status = 'out'
    else if (threshold != null && stock <= threshold) status = 'low'
    return {
      id: i.id,
      name: i.name,
      unit: i.unit,
      stock,
      status,
      lastCount: lastCountDate(movements, i.id),
      locations: breakdownByIngredient.get(i.id) ?? [],
      batches: (batchesByIngredient.get(i.id) ?? [])
        .slice()
        .sort(
          (a, b) =>
            (locOrder.get(a.location_id ?? '') ?? 99) -
            (locOrder.get(b.location_id ?? '') ?? 99)
        )
        .map((b) => ({
          id: b.id,
          batch_code: b.batch_code,
          supplier_lot_no: b.supplier_lot_no,
          received_date: b.received_date,
          quantity_remaining: b.quantity_remaining,
          expiry_date: b.expiry_date,
          unit_cost: b.unit_cost,
          location_name: locName.get(b.location_id ?? '') ?? null,
        })),
    }
  })

  return (
    <div>
      <PageHeader
        title={t('inventory.current_stock')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="gap-2">
              <Link href="/app/inventory/transfer">
                <ArrowLeftRight className="h-4 w-4" />
                {t('inventory.move_stock')}
              </Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href="/app/inventory/count">
                <ClipboardList className="h-4 w-4" />
                {t('inventory.do_count')}
              </Link>
            </Button>
          </div>
        }
      />

      {rows.length === 0 ? (
        <div className="stokly-card">
          <EmptyState message={t('ingredients.empty')} />
        </div>
      ) : (
        <InventoryTable rows={rows} />
      )}
    </div>
  )
}
