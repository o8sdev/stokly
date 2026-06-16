'use client'

import { useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronRight, ChevronDown, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StoklyCard, EmptyState } from '@/components/ui/stokly-theme'
import { toCsv, downloadCsv } from '@/lib/admin/csv'
import { cn, formatDate } from '@/lib/utils'
import type { PurchaseLogEntry } from '@/lib/data/queries'

const money = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (n: number): string =>
  n.toLocaleString('en-US', { maximumFractionDigits: 2 })

interface DayGroup {
  date: string
  items: PurchaseLogEntry[]
  total: number
}

// Purchases (deliveries) journal grouped per day — mirrors the sales journal.
// Each day is collapsible (date · line count · day spend) and expands to the
// bought lines; a from/to filter drives the server query (any day or range)
// and the visible set exports to CSV.
export function PurchasesJournal({
  rows,
  from,
  to,
}: {
  rows: PurchaseLogEntry[]
  from: string
  to: string
}) {
  const t = useTranslations('data')
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState<Set<string>>(new Set())

  const days = useMemo<DayGroup[]>(() => {
    const map = new Map<string, PurchaseLogEntry[]>()
    for (const r of rows) {
      const day = r.created_at.slice(0, 10)
      const arr = map.get(day) ?? []
      arr.push(r)
      map.set(day, arr)
    }
    return [...map.entries()]
      .map(([date, items]) => ({
        date,
        items,
        total: items.reduce((s, i) => s + i.value, 0),
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [rows])

  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + r.value, 0),
    [rows]
  )

  function setBound(key: 'from' | 'to', value: string) {
    if (!value) return
    const sp = new URLSearchParams(params.toString())
    sp.set(key, value)
    sp.delete('range')
    start(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }))
  }

  function toggle(date: string) {
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(date)) n.delete(date)
      else n.add(date)
      return n
    })
  }

  function exportCsv() {
    const flat = days.flatMap((d) => d.items)
    const csv = toCsv(flat, [
      { header: t('col_date'), value: (r) => r.created_at.slice(0, 10) },
      { header: t('col_ingredient'), value: (r) => r.ingredient_name },
      { header: t('col_supplier'), value: (r) => r.supplier_name ?? '' },
      { header: t('col_qty'), value: (r) => `${num(r.quantity)} ${r.unit}` },
      { header: t('col_unit_cost'), value: (r) => r.unit_cost.toFixed(2) },
      { header: t('col_value'), value: (r) => r.value.toFixed(2) },
    ])
    downloadCsv(`stokly-purchases-${from}_${to}.csv`, csv)
  }

  return (
    <div>
      {/* Date range + export */}
      <div
        className={cn(
          'mb-4 flex flex-wrap items-end justify-between gap-3',
          pending && 'opacity-60'
        )}
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            {t('purchases_from')}
            <Input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setBound('from', e.target.value)}
              className="w-auto"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            {t('purchases_to')}
            <Input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setBound('to', e.target.value)}
              className="w-auto"
            />
          </label>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {t('purchases_export')}
        </Button>
      </div>

      {days.length === 0 ? (
        <StoklyCard className="overflow-hidden">
          <EmptyState message={t('purchases_no_rows')} />
        </StoklyCard>
      ) : (
        <StoklyCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>{t('col_date')}</span>
            <span>{t('purchases_day_total')}</span>
          </div>
          <ul className="divide-y divide-border">
            {days.map((d) => {
              const isOpen = open.has(d.date)
              return (
                <li key={d.date}>
                  <button
                    type="button"
                    onClick={() => toggle(d.date)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
                  >
                    <span className="flex items-center gap-2">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{formatDate(d.date)}</span>
                      <span className="text-xs text-muted-foreground">
                        · {t('purchases_day_items', { count: d.items.length })}
                      </span>
                    </span>
                    <span className="font-mono font-semibold tabular-nums">
                      {money(d.total)}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="overflow-x-auto bg-background/50 px-4 pb-3">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead>
                          <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            <th className="py-1.5 text-left font-medium">
                              {t('col_ingredient')}
                            </th>
                            <th className="py-1.5 text-left font-medium">
                              {t('col_supplier')}
                            </th>
                            <th className="py-1.5 text-right font-medium">
                              {t('col_qty')}
                            </th>
                            <th className="py-1.5 text-right font-medium">
                              {t('col_unit_cost')}
                            </th>
                            <th className="py-1.5 text-right font-medium">
                              {t('col_value')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.items.map((it) => (
                            <tr key={it.id} className="border-t border-border/60">
                              <td className="py-1.5">{it.ingredient_name}</td>
                              <td className="py-1.5 text-muted-foreground">
                                {it.supplier_name ?? '—'}
                              </td>
                              <td className="py-1.5 text-right font-mono tabular-nums">
                                {num(it.quantity)} {it.unit}
                              </td>
                              <td className="py-1.5 text-right font-mono tabular-nums">
                                {money(it.unit_cost)}
                              </td>
                              <td className="py-1.5 text-right font-mono tabular-nums">
                                {money(it.value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-4 py-2.5 text-sm">
            <span className="font-medium">{t('purchases_grand_total')}</span>
            <span className="font-mono font-semibold tabular-nums">
              {money(grandTotal)}
            </span>
          </div>
        </StoklyCard>
      )}
    </div>
  )
}
