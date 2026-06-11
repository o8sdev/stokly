'use client'

import { useTranslations } from 'next-intl'
import type { PurchaseLogEntry } from '@/lib/data/queries'
import { DataExplorer, type ExplorerColumn } from './data-explorer'

const money = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (n: number): string =>
  n.toLocaleString('en-US', { maximumFractionDigits: 2 })

export function PurchasesExplorer({ rows }: { rows: PurchaseLogEntry[] }) {
  const t = useTranslations('data')

  const columns: ExplorerColumn<PurchaseLogEntry>[] = [
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
      key: 'supplier',
      label: t('col_supplier'),
      sortable: true,
      searchable: true,
      accessor: (r) => r.supplier_name ?? '',
      render: (r) => r.supplier_name ?? '—',
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
      key: 'unit_cost',
      label: t('col_unit_cost'),
      align: 'right',
      sortable: true,
      accessor: (r) => r.unit_cost,
      render: (r) => money(r.unit_cost),
    },
    {
      key: 'value',
      label: t('col_value'),
      align: 'right',
      sortable: true,
      accessor: (r) => r.value,
      render: (r) => money(r.value),
    },
  ]

  return (
    <DataExplorer
      rows={rows}
      columns={columns}
      initialSort={{ key: 'date', dir: 'desc' }}
      rowKey={(r) => r.id}
      searchPlaceholder={t('search_purchases')}
    />
  )
}
