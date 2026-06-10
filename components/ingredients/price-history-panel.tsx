import { getTranslations } from 'next-intl/server'
import type { PriceHistoryEntry } from '@/lib/data/queries'
import type { PriceStat } from '@/lib/calculations/price-variance'
import { priceVariance, isPriceOutlier } from '@/lib/calculations/price-variance'
import { formatMoney, formatQuantity, formatDate } from '@/lib/utils'

// Supplier price history for one ingredient: last / moving-average / count
// summary + a per-delivery table that flags purchases deviating >10% from the
// average (amber when paid above, green when below).
export async function PriceHistoryPanel({
  entries,
  stat,
  unit,
}: {
  entries: PriceHistoryEntry[]
  stat: PriceStat
  unit: string
}) {
  const t = await getTranslations()

  return (
    <section className="mt-10 max-w-2xl space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {t('price_history.title')}
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <div className="stokly-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('price_history.last')}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
            {stat.last_cost != null ? formatMoney(stat.last_cost) : '—'}
          </p>
        </div>
        <div className="stokly-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('price_history.avg')}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
            {stat.avg_cost != null ? formatMoney(stat.avg_cost) : '—'}
          </p>
        </div>
        <div className="stokly-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('price_history.deliveries')}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
            {stat.delivery_count}
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {t('price_history.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{t('sales.date')}</th>
                <th className="px-4 py-3 font-semibold">
                  {t('inventory.delivery_supplier')}
                </th>
                <th className="px-3 py-3 text-right font-semibold">
                  {t('inventory.delivery_quantity')}
                </th>
                <th className="px-3 py-3 text-right font-semibold">
                  {t('inventory.delivery_unit_cost')}
                </th>
                <th className="px-3 py-3 text-right font-semibold">
                  {t('price_history.vs_avg')}
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const v = priceVariance(e.unit_cost, stat.avg_cost)
                const outlier = isPriceOutlier(e.unit_cost, stat.avg_cost)
                return (
                  <tr
                    key={e.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {formatDate(e.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {e.supplier_name ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                      {formatQuantity(e.quantity)} {unit}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {formatMoney(e.unit_cost)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {v == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span
                          className={
                            outlier
                              ? v > 0
                                ? 'font-semibold text-[#B45309]'
                                : 'font-semibold text-[#047857]'
                              : 'text-muted-foreground'
                          }
                        >
                          {v > 0 ? '+' : ''}
                          {(v * 100).toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
