'use client'

import { useTranslations } from 'next-intl'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import type { CountRow } from '@/lib/data/counts'
import { FoodCostBadge } from '@/components/ui/stokly-theme'
import { DataExplorer, type ExplorerColumn } from './data-explorer'

const money = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function CountsExplorer({ rows }: { rows: CountRow[] }) {
  const t = useTranslations('data')

  const columns: ExplorerColumn<CountRow>[] = [
    {
      key: 'period',
      label: t('col_period'),
      sortable: true,
      searchable: true,
      accessor: (r) => r.period_end,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="tabular-nums">
            {r.period_start} → {r.period_end}
          </span>
          {r.has_missing_sales && (
            <AlertTriangle
              className="h-3.5 w-3.5 text-amber-600"
              aria-label={t('missing_sales_flag')}
            />
          )}
        </span>
      ),
    },
    {
      key: 'days',
      label: t('col_days'),
      align: 'right',
      sortable: true,
      accessor: (r) => r.days_in_period,
    },
    {
      key: 'sales',
      label: t('col_sales'),
      align: 'right',
      sortable: true,
      accessor: (r) => r.sales_total,
      render: (r) => (r.sales_total == null ? '—' : money(r.sales_total)),
    },
    {
      key: 'food_cost',
      label: t('col_food_cost'),
      align: 'right',
      sortable: true,
      accessor: (r) => r.food_cost_percent,
      render: (r) =>
        r.food_cost_percent == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <FoodCostBadge percent={r.food_cost_percent} />
        ),
    },
    {
      key: 'waste',
      label: t('col_waste'),
      align: 'right',
      sortable: true,
      accessor: (r) => r.waste_value,
      render: (r) => (r.waste_value == null ? '—' : money(r.waste_value)),
    },
    {
      key: 'variance',
      label: t('col_variance'),
      align: 'right',
      sortable: true,
      accessor: (r) => r.variance_value,
      render: (r) => {
        const v = r.variance_value
        if (v == null) return <span className="text-muted-foreground">—</span>
        const cls =
          v > 0.005 ? 'text-red-600' : v < -0.005 ? 'text-emerald-600' : ''
        return (
          <span className={cls}>
            {v > 0 ? '+' : ''}
            {money(v)}
          </span>
        )
      },
    },
    {
      key: 'open',
      label: '',
      align: 'right',
      accessor: () => null,
      render: (r) => (
        <Link
          href={`/app/reports/period/${r.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t('col_open')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ]

  return (
    <DataExplorer
      rows={rows}
      columns={columns}
      initialSort={{ key: 'period', dir: 'desc' }}
      rowKey={(r) => r.id}
      searchPlaceholder={t('search_counts')}
    />
  )
}
