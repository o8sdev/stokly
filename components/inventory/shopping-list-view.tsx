import { getTranslations } from 'next-intl/server'
import { AlertTriangle, ShoppingCart } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import type { ShoppingListData } from '@/lib/data/queries'
import { formatMoney, formatQuantity } from '@/lib/utils'

// Build a /app/purchases?prefill=id:qty,… link (locale prefixed by the i18n
// Link). The DeliveryForm seeds its lines from this.
function prefillHref(
  items: { ingredient_id: string; suggested_qty: number }[]
): string {
  const enc = encodeURIComponent(
    items.map((i) => `${i.ingredient_id}:${i.suggested_qty}`).join(',')
  )
  return `/app/purchases?prefill=${enc}`
}

// The build-to-par order list: summary + a "create purchase" CTA, then one card
// per supplier with its items and an "order these" prefill link.
export async function ShoppingListView({ data }: { data: ShoppingListData }) {
  const t = await getTranslations()
  const allItems = data.groups.flatMap((g) => g.items)

  return (
    <div className="space-y-6">
      {/* Summary + create-purchase CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-sm">
          <div className="stokly-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('shopping.items_to_order')}
            </p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
              {data.item_count}
            </p>
          </div>
          <div className="stokly-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('shopping.est_total')}
            </p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
              {formatMoney(data.total_est)}
            </p>
          </div>
        </div>
        <Link
          href={prefillHref(allItems)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <ShoppingCart className="h-4 w-4" />
          {t('shopping.create_purchase')}
        </Link>
      </div>

      {/* One card per supplier */}
      {data.groups.map((group) => (
        <div
          key={group.supplier_id ?? 'none'}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">
                {group.supplier_name ?? t('shopping.no_supplier')}
              </h3>
              <span className="text-xs text-muted-foreground">
                · {group.items.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold tabular-nums">
                {formatMoney(group.subtotal)}
              </span>
              <Link
                href={prefillHref(group.items)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {t('shopping.order_from_supplier')}
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">
                    {t('recipes.line_ingredient')}
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    {t('shopping.col_on_hand')}
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    {t('shopping.col_par')}
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    {t('shopping.col_suggested')}
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    {t('shopping.col_last_cost')}
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    {t('shopping.col_est')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr
                    key={item.ingredient_id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        {item.below_threshold && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#92400E]">
                            <AlertTriangle className="h-3 w-3" />
                            {t('shopping.urgent')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                      {formatQuantity(item.on_hand)} {item.unit}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                      {item.par_level != null
                        ? `${formatQuantity(item.par_level)} ${item.unit}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">
                      {item.suggested_qty > 0
                        ? `${formatQuantity(item.suggested_qty)} ${item.unit}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                      {formatMoney(item.last_cost)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {item.est_cost > 0 ? formatMoney(item.est_cost) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
