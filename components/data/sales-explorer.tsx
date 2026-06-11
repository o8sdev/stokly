'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { SalesLogEntry } from '@/lib/data/queries'
import { DataExplorer, type ExplorerColumn } from './data-explorer'

const money = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (n: number): string =>
  n.toLocaleString('en-US', { maximumFractionDigits: 2 })

export function SalesExplorer({ rows }: { rows: SalesLogEntry[] }) {
  const t = useTranslations('data')

  const columns: ExplorerColumn<SalesLogEntry>[] = [
    {
      key: 'date',
      label: t('col_date'),
      sortable: true,
      searchable: true,
      accessor: (r) => r.sale_date,
    },
    {
      key: 'dish',
      label: t('col_dish'),
      sortable: true,
      searchable: true,
      accessor: (r) => r.recipe_name,
    },
    {
      key: 'qty',
      label: t('col_qty'),
      align: 'right',
      sortable: true,
      accessor: (r) => r.quantity,
      render: (r) => num(r.quantity),
    },
    {
      key: 'price',
      label: t('col_unit_price'),
      align: 'right',
      sortable: true,
      accessor: (r) => r.unit_price,
      render: (r) => money(r.unit_price),
    },
    {
      key: 'total',
      label: t('col_total'),
      align: 'right',
      sortable: true,
      accessor: (r) => r.line_total,
      render: (r) => money(r.line_total),
    },
    {
      key: 'type',
      label: t('col_type'),
      sortable: true,
      accessor: (r) => (r.is_comp ? 'comp' : 'sale'),
      render: (r) =>
        r.is_comp ? (
          <span
            className={cn(
              'inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700'
            )}
          >
            {t('comp')}
          </span>
        ) : (
          <span className="text-muted-foreground">{t('sale')}</span>
        ),
    },
  ]

  return (
    <DataExplorer
      rows={rows}
      columns={columns}
      initialSort={{ key: 'date', dir: 'desc' }}
      rowKey={(r) => r.id}
      searchPlaceholder={t('search_sales')}
    />
  )
}
