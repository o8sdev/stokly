'use client'

import { Fragment, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  DataTable,
  MonoValue,
  StockBadge,
  type StockStatus,
} from '@/components/ui/stokly-theme'
import { cn, formatQuantity, formatMoney, formatDate } from '@/lib/utils'

export interface InventoryBatch {
  id: string
  received_date: string
  quantity_remaining: number
  expiry_date: string | null
  unit_cost: number
}

export interface InventoryRow {
  id: string
  name: string
  unit: string
  stock: number
  status: StockStatus
  lastCount: string | null
  batches: InventoryBatch[]
}

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  const t = useTranslations()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const statusLabel: Record<StockStatus, string> = {
    ok: t('inventory.status_ok'),
    low: t('inventory.status_low'),
    out: t('inventory.status_zero'),
  }

  return (
    <DataTable
      columns={[
        { label: t('ingredients.name') },
        { label: t('inventory.current_stock'), align: 'right' },
        { label: t('common.actions') },
        { label: t('inventory.last_count') },
      ]}
    >
      {rows.map((row) => {
        const isOpen = expanded.has(row.id)
        const hasBatches = row.batches.length > 0
        return (
          <Fragment key={row.id}>
            <TableRow
              className={cn(hasBatches && 'cursor-pointer')}
              onClick={hasBatches ? () => toggle(row.id) : undefined}
            >
              <TableCell className="font-medium">
                <span className="flex items-center gap-1.5">
                  {hasBatches ? (
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                        isOpen && 'rotate-90'
                      )}
                    />
                  ) : (
                    <span className="inline-block w-4" />
                  )}
                  {row.name}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <MonoValue value={formatQuantity(row.stock)} unit={row.unit} />
              </TableCell>
              <TableCell>
                <StockBadge
                  status={row.status}
                  label={statusLabel[row.status]}
                />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(row.lastCount)}
              </TableCell>
            </TableRow>

            {isOpen && hasBatches && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="bg-secondary/30 p-0">
                  <div className="px-6 py-3">
                    <div className="overflow-hidden rounded-md border border-border bg-card">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                            <th className="px-3 py-2 text-left font-semibold">
                              {t('inventory.batch_received')}
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              {t('inventory.batch_remaining')}
                            </th>
                            <th className="px-3 py-2 text-left font-semibold">
                              {t('inventory.batch_expiry')}
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              {t('inventory.batch_cost')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.batches.map((b) => (
                            <tr
                              key={b.id}
                              className="border-b border-[#F0F4F8] last:border-0"
                            >
                              <td className="px-3 py-2">
                                {formatDate(b.received_date)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <MonoValue
                                  value={formatQuantity(b.quantity_remaining)}
                                  unit={row.unit}
                                />
                              </td>
                              <td className="px-3 py-2">
                                {b.expiry_date
                                  ? formatDate(b.expiry_date)
                                  : '—'}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <MonoValue value={formatMoney(b.unit_cost)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        )
      })}
    </DataTable>
  )
}
