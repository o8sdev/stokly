import { getTranslations } from 'next-intl/server'
import type { PurchaseLogEntry } from '@/lib/data/queries'
import { formatMoney, formatDate } from '@/lib/utils'

// Read-only history of purchases (one row per bought line). Mirrors the waste
// log table, minus the reverse action — past purchases aren't undone here.
export async function PurchaseLogTable({
  entries,
}: {
  entries: PurchaseLogEntry[]
}) {
  const t = await getTranslations()

  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {t('purchases.empty')}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">{t('sales.date')}</th>
            <th className="px-4 py-3 font-semibold">
              {t('recipes.line_ingredient')}
            </th>
            <th className="px-3 py-3 text-right font-semibold">
              {t('inventory.delivery_quantity')}
            </th>
            <th className="px-3 py-3 text-right font-semibold">
              {t('inventory.delivery_unit_cost')}
            </th>
            <th className="px-3 py-3 text-right font-semibold">
              {t('purchases.total')}
            </th>
            <th className="px-4 py-3 font-semibold">
              {t('inventory.delivery_supplier')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.id}
              className="border-b border-border/60 last:border-0"
            >
              <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                {formatDate(e.created_at)}
              </td>
              <td className="px-4 py-2.5 font-medium">{e.ingredient_name}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                {e.quantity} {e.unit}
              </td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                {formatMoney(e.unit_cost)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">
                {formatMoney(e.value)}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {e.supplier_name ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
