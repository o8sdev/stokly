'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react'
import { StoklyCard } from '@/components/ui/stokly-theme'
import { formatMoney, cn } from '@/lib/utils'
import type {
  FoodCostRecipeRow,
  FoodCostStatus,
} from '@/lib/calculations/food-cost-monitor'

const STATUS_COLOR: Record<
  FoodCostStatus,
  { text: string; bg: string; border: string }
> = {
  over: { text: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
  near: { text: '#9A3412', bg: '#FFF7ED', border: '#FED7AA' },
  under: { text: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
}

// Recipe food-cost monitor: each dish's current food cost % vs its limit
// (target), colour-coded with the discrepancy, and an expandable breakdown of
// the ingredients with their previous → current unit cost and the change.
export function FoodCostMonitor({ rows }: { rows: FoodCostRecipeRow[] }) {
  const t = useTranslations('dashboard')
  const [openId, setOpenId] = useState<string | null>(null)
  const overCount = rows.filter((r) => r.status === 'over').length

  return (
    <StoklyCard className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t('fcm_title')}</h2>
        </div>
        {overCount > 0 && (
          <span className="rounded-full bg-[#FEF2F2] px-2.5 py-0.5 text-xs font-semibold text-[#991B1B]">
            {t('fcm_over_count', { count: overCount })}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          {t('fcm_empty')}
        </p>
      ) : (
        <div className="max-h-[28rem] divide-y divide-[#F0F4F8] overflow-y-auto">
          {rows.map((r) => {
            const c = STATUS_COLOR[r.status]
            const isOpen = openId === r.id
            const gap = r.discrepancy
            return (
              <div key={r.id}>
                <button
                  onClick={() => setOpenId(isOpen ? null : r.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-[#F8FAFC]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {r.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(r.costPerServing)} / {formatMoney(r.salePrice)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className="rounded-md border px-2 py-1 font-mono text-xs font-semibold tabular-nums"
                      style={{
                        color: c.text,
                        backgroundColor: c.bg,
                        borderColor: c.border,
                      }}
                      title={t('fcm_current')}
                    >
                      {r.foodCostPercent.toFixed(1)}%
                    </span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {t('fcm_limit')} {r.target.toFixed(0)}%
                    </span>
                    <span
                      className="w-12 text-right font-mono text-xs font-semibold tabular-nums"
                      style={{ color: gap > 0 ? '#991B1B' : '#166534' }}
                      title={t('fcm_gap')}
                    >
                      {gap > 0 ? '+' : ''}
                      {gap.toFixed(1)}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="bg-[#FAFBFC] px-5 pb-4 pt-1">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="py-1 text-left font-medium">
                            {t('fcm_ingredient')}
                          </th>
                          <th className="py-1 text-right font-medium">
                            {t('fcm_prev')}
                          </th>
                          <th className="py-1 text-right font-medium">
                            {t('fcm_curr')}
                          </th>
                          <th className="py-1 text-right font-medium">
                            {t('fcm_change')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.ingredients.map((ing, i) => {
                          const up = ing.deltaPct != null && ing.deltaPct > 0.05
                          const down =
                            ing.deltaPct != null && ing.deltaPct < -0.05
                          return (
                            <tr key={i} className="border-t border-[#EEF2F6]">
                              <td className="py-1.5 pr-2 text-foreground">
                                {ing.name}
                              </td>
                              <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                                {ing.prevUnit != null
                                  ? formatMoney(ing.prevUnit)
                                  : '—'}
                              </td>
                              <td className="py-1.5 text-right font-mono tabular-nums text-foreground">
                                {formatMoney(ing.currUnit)}
                              </td>
                              <td className="py-1.5 text-right font-mono tabular-nums">
                                {ing.deltaPct == null ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  <span
                                    className="inline-flex items-center justify-end gap-0.5"
                                    style={{
                                      color: up
                                        ? '#991B1B'
                                        : down
                                          ? '#166534'
                                          : '#64748B',
                                    }}
                                  >
                                    {up && <ArrowUpRight className="h-3 w-3" />}
                                    {down && (
                                      <ArrowDownRight className="h-3 w-3" />
                                    )}
                                    {ing.deltaPct > 0 ? '+' : ''}
                                    {ing.deltaPct.toFixed(1)}%
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </StoklyCard>
  )
}
