import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ClipboardList } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getIngredients,
  getStockMovements,
  getActiveBatches,
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

  const [ingredients, movements, batches] = await Promise.all([
    getIngredients(ctx.tenantId),
    getStockMovements(ctx.tenantId),
    getActiveBatches(ctx.tenantId),
  ])

  const levels = deriveAllStockLevels(movements)

  // Group active batches by ingredient (already FIFO-ordered by query).
  const batchesByIngredient = new Map<string, typeof batches>()
  for (const b of batches) {
    const arr = batchesByIngredient.get(b.ingredient_id) ?? []
    arr.push(b)
    batchesByIngredient.set(b.ingredient_id, arr)
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
      batches: (batchesByIngredient.get(i.id) ?? []).map((b) => ({
        id: b.id,
        batch_code: b.batch_code,
        supplier_lot_no: b.supplier_lot_no,
        received_date: b.received_date,
        quantity_remaining: b.quantity_remaining,
        expiry_date: b.expiry_date,
        unit_cost: b.unit_cost,
      })),
    }
  })

  return (
    <div>
      <PageHeader
        title={t('inventory.current_stock')}
        action={
          <Button asChild className="gap-2">
            <Link href="/app/inventory/count">
              <ClipboardList className="h-4 w-4" />
              {t('inventory.do_count')}
            </Link>
          </Button>
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
