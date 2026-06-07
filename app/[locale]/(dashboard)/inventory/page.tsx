import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ClipboardList } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import { getIngredients, getStockMovements } from '@/lib/data/queries'
import {
  deriveAllStockLevels,
  lastCountDate,
} from '@/lib/calculations/stock-level'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  DataTable,
  MonoValue,
  StockBadge,
  EmptyState,
  type StockStatus,
} from '@/components/ui/stokly-theme'
import { formatQuantity, formatDate } from '@/lib/utils'

export default async function InventoryPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const [ingredients, movements] = await Promise.all([
    getIngredients(ctx.tenantId),
    getStockMovements(ctx.tenantId),
  ])

  const levels = deriveAllStockLevels(movements)

  const rows = ingredients.map((i) => {
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
    }
  })

  const statusLabel: Record<StockStatus, string> = {
    ok: t('inventory.status_ok'),
    low: t('inventory.status_low'),
    out: t('inventory.status_zero'),
  }

  return (
    <div>
      <PageHeader
        title={t('inventory.current_stock')}
        action={
          <Button asChild className="gap-2">
            <Link href="/inventory/count">
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
        <DataTable
          columns={[
            { label: t('ingredients.name') },
            { label: t('inventory.current_stock'), align: 'right' },
            { label: t('common.actions') },
            { label: t('inventory.last_count') },
          ]}
        >
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-right">
                <MonoValue value={formatQuantity(row.stock)} unit={row.unit} />
              </TableCell>
              <TableCell>
                <StockBadge
                  status={row.status}
                  label={statusLabel[row.status]}
                />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(row.lastCount)}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  )
}
