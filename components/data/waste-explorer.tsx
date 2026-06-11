'use client'

import { useTranslations } from 'next-intl'
import type { WasteLogEntry } from '@/lib/data/queries'
import { DataExplorer, type ExplorerColumn } from './data-explorer'

const money = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (n: number): string =>
  n.toLocaleString('en-US', { maximumFractionDigits: 2 })

export function WasteExplorer({ rows }: { rows: WasteLogEntry[] }) {
  const t = useTranslations('data')

  const columns: ExplorerColumn<WasteLogEntry>[] = [
    {
      key: 'date',
      label: t('col_date'),
      sortable: true,
      searchable: true,
      accessor: (r) => r.created_at,
      render: (r) => r.created_at.slice(0, 10),
    },
    {
      key: 'ingredient',
      label: t('col_ingredient'),
      sortable: true,
      searchable: true,
      accessor: (r) => r.ingredient_name,
    },
    {
      key: 'category',
      label: t('col_category'),
      sortable: true,
      searchable: true,
      accessor: (r) => r.category_name ?? '',
      render: (r) => r.category_name ?? t('uncategorized'),
    },
    {
      key: 'qty',
      label: t('col_qty'),
      align: 'right',
      sortable: true,
      accessor: (r) => r.quantity,
      render: (r) => `${num(r.quantity)} ${r.unit}`,
    },
    {
      key: 'value',
      label: t('col_value'),
      align: 'right',
      sortable: true,
      accessor: (r) => r.value,
      render: (r) => money(r.value),
    },
    {
      key: 'status',
      label: t('col_status'),
      sortable: true,
      accessor: (r) => (r.reversed ? 'reversed' : ''),
      render: (r) =>
        r.reversed ? (
          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {t('reversed')}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  return (
    <DataExplorer
      rows={rows}
      columns={columns}
      initialSort={{ key: 'date', dir: 'desc' }}
      rowKey={(r) => r.id}
      searchPlaceholder={t('search_waste')}
    />
  )
}
