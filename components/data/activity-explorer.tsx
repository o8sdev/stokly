'use client'

import { useTranslations } from 'next-intl'
import type { ActivityEntry } from '@/lib/data/activity'
import { DataExplorer, type ExplorerColumn } from './data-explorer'

// action string -> i18n key under the `activity` namespace.
const ACTION_LABELS: Record<string, string> = {
  'ingredient.archive': 'action_ingredient_archive',
  'ingredient.restore': 'action_ingredient_restore',
  'supplier.archive': 'action_supplier_archive',
  'supplier.restore': 'action_supplier_restore',
  'recipe.archive': 'action_recipe_archive',
  'recipe.restore': 'action_recipe_restore',
  'location.archive': 'action_location_archive',
  'location.restore': 'action_location_restore',
  'sales.confirm': 'action_sales_confirm',
  'sales.void': 'action_sales_void',
  'waste.record': 'action_waste_record',
  'waste.reverse': 'action_waste_reverse',
  'inventory.writeoff_expired': 'action_writeoff_expired',
  'inventory.count': 'action_count',
  'inventory.transfer': 'action_transfer',
  'production.run': 'action_production_run',
  'production.void': 'action_production_void',
}

// Compact, human summary of the meta payload (name / date / qty / reason …).
function details(meta: Record<string, unknown>): string {
  const parts: string[] = []
  if (meta.name) parts.push(String(meta.name))
  if (meta.date) parts.push(String(meta.date))
  if (meta.quantity != null) parts.push(`×${meta.quantity}`)
  if (meta.lines != null) parts.push(`${meta.lines}`)
  if (meta.batches != null) parts.push(`${meta.batches}`)
  if (meta.reason) parts.push(`“${meta.reason}”`)
  return parts.join(' · ')
}

export function ActivityExplorer({ rows }: { rows: ActivityEntry[] }) {
  const t = useTranslations('data')
  const ta = useTranslations('activity')

  const columns: ExplorerColumn<ActivityEntry>[] = [
    {
      key: 'time',
      label: t('col_time'),
      sortable: true,
      searchable: true,
      accessor: (r) => r.created_at,
      render: (r) => r.created_at.replace('T', ' ').slice(0, 16),
    },
    {
      key: 'actor',
      label: t('col_actor'),
      sortable: true,
      searchable: true,
      accessor: (r) => r.actor_email ?? '—',
      render: (r) => r.actor_email ?? '—',
    },
    {
      key: 'action',
      label: t('col_action'),
      sortable: true,
      searchable: true,
      accessor: (r) =>
        ACTION_LABELS[r.action] ? ta(ACTION_LABELS[r.action]) : r.action,
    },
    {
      key: 'details',
      label: t('col_details'),
      searchable: true,
      accessor: (r) => details(r.meta),
      render: (r) => (
        <span className="text-muted-foreground">{details(r.meta)}</span>
      ),
    },
  ]

  return (
    <DataExplorer
      rows={rows}
      columns={columns}
      initialSort={{ key: 'time', dir: 'desc' }}
      rowKey={(r) => r.id}
      searchPlaceholder={t('search_activity')}
    />
  )
}
