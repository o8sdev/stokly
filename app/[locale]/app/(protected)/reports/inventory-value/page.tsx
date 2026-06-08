import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getIngredients,
  getStockMovements,
  getSuppliers,
} from '@/lib/data/queries'
import { deriveAllStockLevels } from '@/lib/calculations/stock-level'
import { PageHeader } from '@/components/layout/page-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  StoklyCard,
  MetricCard,
  MonoValue,
  EmptyState,
} from '@/components/ui/stokly-theme'
import { formatMoney, formatQuantity } from '@/lib/utils'

interface ValueRow {
  id: string
  name: string
  unit: string
  stock: number
  costPerUnit: number
  value: number
  supplierName: string
}

export default async function InventoryValuePage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const [ingredients, movements, suppliers] = await Promise.all([
    getIngredients(ctx.tenantId),
    getStockMovements(ctx.tenantId),
    getSuppliers(ctx.tenantId),
  ])

  const levels = deriveAllStockLevels(movements)
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]))
  const noSupplier = t('ingredients.no_supplier')

  const rows: ValueRow[] = ingredients.map((i) => {
    const stock = levels.get(i.id) ?? 0
    return {
      id: i.id,
      name: i.name,
      unit: i.unit,
      stock,
      costPerUnit: i.cost_per_unit,
      value: stock * i.cost_per_unit,
      supplierName: i.supplier_id
        ? supplierName.get(i.supplier_id) ?? noSupplier
        : noSupplier,
    }
  })

  const total = rows.reduce((sum, r) => sum + r.value, 0)

  // Group rows by supplier for the grouped view.
  const groups = new Map<string, ValueRow[]>()
  for (const row of rows) {
    const arr = groups.get(row.supplierName) ?? []
    arr.push(row)
    groups.set(row.supplierName, arr)
  }

  return (
    <div>
      <PageHeader title={t('reports.inventory_value')} />

      <div className="mb-4 max-w-xs">
        <MetricCard
          label={t('reports.total_value')}
          value={total.toFixed(2)}
          unit="AZN"
        />
      </div>

      {rows.length === 0 ? (
        <div className="stokly-card">
          <EmptyState message={t('ingredients.empty')} />
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([supplier, groupRows]) => {
            const subtotal = groupRows.reduce((s, r) => s + r.value, 0)
            return (
              <StoklyCard key={supplier} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <span className="text-sm font-semibold">{supplier}</span>
                  <MonoValue
                    value={formatMoney(subtotal)}
                    className="text-sm text-muted-foreground"
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t('ingredients.name')}</TableHead>
                      <TableHead className="text-right">
                        {t('inventory.current_stock')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('ingredients.cost')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('reports.value')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.name}
                        </TableCell>
                        <TableCell className="text-right">
                          <MonoValue
                            value={formatQuantity(row.stock)}
                            unit={row.unit}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <MonoValue value={formatMoney(row.costPerUnit)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <MonoValue
                            value={formatMoney(row.value)}
                            className="font-medium"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </StoklyCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
