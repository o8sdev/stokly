import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  CalendarX,
  CheckCircle2,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/utils'
import { StoklyCard } from '@/components/ui/stokly-theme'
import type { TopDish, NamedValue } from '@/lib/data/overview'

const money = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// The three drill-down panels under the overview: best sellers, where the money
// went (purchases), where it leaked (waste). Each is a compact top-list.
export async function OverviewPanels({
  data,
}: {
  data: {
    topDishes: TopDish[]
    supplierSpend: NamedValue[]
    wasteByReason: NamedValue[]
  }
}) {
  const t = await getTranslations('overview')
  const maxSpend = Math.max(1, ...data.supplierSpend.map((s) => s.value))
  const maxWaste = Math.max(1, ...data.wasteByReason.map((w) => w.value))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Top dishes by revenue */}
      <StoklyCard className="px-5 py-4">
        <h2 className="text-sm font-semibold">{t('top_dishes_title')}</h2>
        <div className="mt-3">
          {data.topDishes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('no_data')}
            </p>
          ) : (
            data.topDishes.map((d) => (
              <div
                key={d.recipeId}
                className="flex items-center justify-between border-b border-border/60 py-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('units_sold', { count: Math.round(d.units) })}
                  </p>
                </div>
                <span className="shrink-0 pl-3 font-mono text-sm tabular-nums">
                  {money(d.revenue)}
                </span>
              </div>
            ))
          )}
        </div>
      </StoklyCard>

      {/* Spend by supplier */}
      <StoklyCard className="px-5 py-4">
        <h2 className="text-sm font-semibold">{t('supplier_spend')}</h2>
        <div className="mt-3 space-y-2.5">
          {data.supplierSpend.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('no_data')}
            </p>
          ) : (
            data.supplierSpend.map((s, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{s.name ?? t('no_supplier')}</span>
                  <span className="shrink-0 pl-3 font-mono tabular-nums">
                    {money(s.value)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-secondary">
                  <div
                    className="h-full rounded bg-primary/70"
                    style={{ width: `${Math.round((s.value / maxSpend) * 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </StoklyCard>

      {/* Waste by reason */}
      <StoklyCard className="px-5 py-4">
        <h2 className="text-sm font-semibold">{t('waste_by_reason')}</h2>
        <div className="mt-3 space-y-2.5">
          {data.wasteByReason.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('no_data')}
            </p>
          ) : (
            data.wasteByReason.map((w, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{w.name ?? t('uncategorized')}</span>
                  <span className="shrink-0 pl-3 font-mono tabular-nums">
                    {money(w.value)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-secondary">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${Math.round((w.value / maxWaste) * 100)}%`,
                      backgroundColor: '#D85A30',
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </StoklyCard>
    </div>
  )
}

// A strip of clickable attention chips. Counts are "as of now" inventory states
// plus missing-sales days for the range; hidden when zero. All clear → one tidy
// "all good" line.
export async function AttentionStrip({
  lowStock,
  expiring,
  oversold,
  missingSales,
}: {
  lowStock: number
  expiring: number
  oversold: number
  missingSales: number
}) {
  const t = await getTranslations('overview')

  const chips: {
    key: string
    icon: ReactNode
    label: string
    href: string
    danger?: boolean
  }[] = []
  if (lowStock > 0)
    chips.push({
      key: 'low',
      icon: <AlertTriangle className="h-4 w-4" />,
      label: t('low_stock_n', { count: lowStock }),
      href: '/app/inventory',
    })
  if (expiring > 0)
    chips.push({
      key: 'exp',
      icon: <Clock className="h-4 w-4" />,
      label: t('expiring_n', { count: expiring }),
      href: '/app/inventory',
    })
  if (oversold > 0)
    chips.push({
      key: 'neg',
      icon: <TrendingDown className="h-4 w-4" />,
      label: t('oversold_n', { count: oversold }),
      href: '/app/inventory',
      danger: true,
    })
  if (missingSales > 0)
    chips.push({
      key: 'mis',
      icon: <CalendarX className="h-4 w-4" />,
      label: t('missing_sales_n', { count: missingSales }),
      href: '/app/sales',
    })

  return (
    <StoklyCard className="px-5 py-4">
      <h2 className="text-sm font-semibold">{t('attention')}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.length === 0 ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            {t('all_good')}
          </span>
        ) : (
          chips.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                c.danger
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              )}
            >
              {c.icon}
              {c.label}
            </Link>
          ))
        )}
      </div>
    </StoklyCard>
  )
}
