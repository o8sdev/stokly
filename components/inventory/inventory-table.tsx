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
  batch_code: string | null
  supplier_lot_no: string | null
  received_date: string
  quantity_remaining: number
  expiry_date: string | null
  unit_cost: number
  location_name: string | null
}

export interface InventoryRow {
  id: string
  name: string
  unit: string
  stock: number
  status: StockStatus
  lastCount: string | null
  batches: InventoryBatch[]
  // Active stock split by location, e.g. [{ name: 'Anbar', qty: 5 }].
  locations: { name: string; qty: number }[]
}

export function InventoryTable({
  rows,
  locations = [],
}: {
  rows: InventoryRow[]
  // Storage-location names, in display order, for the per-location filter.
  locations?: string[]
}) {
  const t = useTranslations()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // 'all' = whole business; a location name = that location's stock only.
  const [loc, setLoc] = useState<string>('all')

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
    negative: t('inventory.status_negative'),
  }

  function locQty(row: InventoryRow): number {
    return row.locations.find((l) => l.name === loc)?.qty ?? 0
  }
  // Status for a single location: thresholds are per-ingredient totals, so the
  // filtered view only distinguishes negative / empty / present.
  function locStatus(qty: number): StockStatus {
    if (qty < 0) return 'negative'
    if (qty <= 0) return 'out'
    return 'ok'
  }

  const filtered =
    loc === 'all'
      ? rows
      : rows.filter(
          (r) =>
            locQty(r) !== 0 ||
            r.batches.some((b) => b.location_name === loc)
        )

  return (
    <>
      {locations.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('inventory.location')}
          </span>
          <select
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-card px-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
          >
            <option value="all">{t('inventory.all_locations')}</option>
            {locations.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      )}
      <DataTable
      columns={[
        { label: t('ingredients.name') },
        { label: t('inventory.current_stock'), align: 'right' },
        { label: t('common.actions') },
        { label: t('inventory.last_count') },
      ]}
    >
      {filtered.map((row) => {
        const visibleBatches =
          loc === 'all'
            ? row.batches
            : row.batches.filter((b) => b.location_name === loc)
        const isOpen = expanded.has(row.id)
        const hasBatches = visibleBatches.length > 0
        const displayStock = loc === 'all' ? row.stock : locQty(row)
        const displayStatus = loc === 'all' ? row.status : locStatus(displayStock)
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
                  <span className="flex flex-col">
                    {row.name}
                    {loc === 'all' && row.locations.length > 0 && (
                      <span className="text-[11px] font-normal text-muted-foreground">
                        {row.locations
                          .map(
                            (l) => `${l.name} ${formatQuantity(l.qty)}`
                          )
                          .join(' · ')}
                      </span>
                    )}
                  </span>
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    displayStock < 0 && 'font-semibold text-[#DC2626]'
                  )}
                >
                  <MonoValue
                    value={formatQuantity(displayStock)}
                    unit={row.unit}
                  />
                </span>
              </TableCell>
              <TableCell>
                <StockBadge
                  status={displayStatus}
                  label={statusLabel[displayStatus]}
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
                              {t('inventory.batch_code')}
                            </th>
                            <th className="px-3 py-2 text-left font-semibold">
                              {t('inventory.location')}
                            </th>
                            <th className="px-3 py-2 text-left font-semibold">
                              {t('inventory.batch_received')}
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              {t('inventory.batch_remaining')}
                            </th>
                            <th className="px-3 py-2 text-left font-semibold">
                              {t('inventory.batch_expiry')}
                            </th>
                            <th className="px-3 py-2 text-left font-semibold">
                              {t('inventory.supplier_lot')}
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              {t('inventory.batch_cost')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleBatches.map((b) => (
                            <tr
                              key={b.id}
                              className="border-b border-[#F0F4F8] last:border-0"
                            >
                              <td className="px-3 py-2 font-mono text-xs font-medium">
                                {b.batch_code ?? '—'}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {b.location_name ?? '—'}
                              </td>
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
                              <td className="px-3 py-2 text-muted-foreground">
                                {b.supplier_lot_no ?? '—'}
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
    </>
  )
}
