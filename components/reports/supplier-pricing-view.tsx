'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  type TooltipProps,
} from 'recharts'
import { ChevronDown, ArrowUpRight, TrendingUp, AlertTriangle } from 'lucide-react'
import { StoklyCard } from '@/components/ui/stokly-theme'
import { formatMoney, cn } from '@/lib/utils'
import type {
  IngredientComparison,
  MonthlyPoint,
} from '@/lib/calculations/supplier-pricing'

export interface PriceAlertVM {
  ingredientId: string
  name: string
  unit: string
  last: number
  avg: number
  variancePct: number
  affectedDishes: string[]
}

export function SupplierPricingView({
  alerts,
  comparison,
  trends,
  trendNames,
}: {
  alerts: PriceAlertVM[]
  comparison: IngredientComparison[]
  trends: Record<string, MonthlyPoint[]>
  trendNames: Record<string, string>
}) {
  const t = useTranslations('reports')
  const [openId, setOpenId] = useState<string | null>(null)
  // The trend is all-time (seasonality), independent of the period filter, so
  // build the picker from every ingredient with delivery history, most months
  // first.
  const pickable = Object.keys(trends)
    .filter((id) => (trends[id]?.length ?? 0) > 0)
    .map((id) => ({ ingredientId: id, name: trendNames[id] ?? '—' }))
    .sort(
      (a, b) =>
        (trends[b.ingredientId]?.length ?? 0) -
        (trends[a.ingredientId]?.length ?? 0)
    )
  const [trendId, setTrendId] = useState<string>(
    pickable[0]?.ingredientId ?? ''
  )
  const trend = trends[trendId] ?? []

  return (
    <div className="space-y-4">
      {/* Price-rise alerts */}
      {alerts.length > 0 && (
        <StoklyCard className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <AlertTriangle className="h-4 w-4 text-[#D97706]" />
            <h2 className="text-sm font-semibold">{t('sp_alerts_title')}</h2>
          </div>
          <div className="divide-y divide-[#F0F4F8]">
            {alerts.map((a) => (
              <div key={a.ingredientId} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{a.name}</span>
                  <span className="flex items-center gap-2 text-sm">
                    <span className="font-mono tabular-nums text-foreground">
                      {formatMoney(a.last)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-[#991B1B]">
                      <ArrowUpRight className="h-3 w-3" />+{a.variancePct}%
                    </span>
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('sp_vs_avg', { avg: formatMoney(a.avg) })}
                  {a.affectedDishes.length > 0 && (
                    <>
                      {' · '}
                      <span className="text-[#991B1B]">
                        {t('sp_affected')}: {a.affectedDishes.join(', ')}
                      </span>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        </StoklyCard>
      )}

      {/* Supplier comparison */}
      <StoklyCard className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t('sp_compare_title')}</h2>
        </div>
        {comparison.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            {t('sp_no_purchases')}
          </p>
        ) : (
          <div className="divide-y divide-[#F0F4F8]">
            {comparison.map((c) => {
              const isOpen = openId === c.ingredientId
              const multi = c.suppliers.length > 1
              return (
                <div key={c.ingredientId}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : c.ingredientId)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-[#F8FAFC]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {c.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('sp_suppliers_n', { count: c.suppliers.length })} ·{' '}
                        {t('sp_paid_avg')} {formatMoney(c.paidAvg)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {multi && c.potentialSaving > 0 && (
                        <span
                          className="rounded-md bg-[#F0FDF4] px-2 py-1 font-mono text-xs font-semibold text-[#166534]"
                          title={t('sp_saving_hint')}
                        >
                          −{formatMoney(c.potentialSaving)}
                        </span>
                      )}
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-muted-foreground transition-transform',
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
                              {t('sp_supplier')}
                            </th>
                            <th className="py-1 text-right font-medium">
                              {t('sp_deliveries')}
                            </th>
                            <th className="py-1 text-right font-medium">
                              {t('sp_avg')}
                            </th>
                            <th className="py-1 text-right font-medium">
                              {t('sp_range')}
                            </th>
                            <th className="py-1 text-right font-medium">
                              {t('sp_last')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.suppliers.map((s, i) => {
                            const cheapest = i === 0 && c.suppliers.length > 1
                            return (
                              <tr
                                key={s.supplier || '—'}
                                className="border-t border-[#EEF2F6]"
                              >
                                <td className="py-1.5 pr-2">
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1',
                                      cheapest
                                        ? 'font-semibold text-[#166534]'
                                        : 'text-foreground'
                                    )}
                                  >
                                    {s.supplier || t('sp_no_supplier')}
                                    {cheapest && (
                                      <span className="rounded-sm bg-[#F0FDF4] px-1 text-[10px] font-semibold text-[#166534]">
                                        {t('sp_cheapest')}
                                      </span>
                                    )}
                                  </span>
                                </td>
                                <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                                  {s.deliveries}
                                </td>
                                <td className="py-1.5 text-right font-mono tabular-nums text-foreground">
                                  {formatMoney(s.avg)}
                                </td>
                                <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                                  {formatMoney(s.min)}–{formatMoney(s.max)}
                                </td>
                                <td className="py-1.5 text-right font-mono tabular-nums text-foreground">
                                  {formatMoney(s.last)}
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

      {/* Price trend / seasonality */}
      <StoklyCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">{t('sp_trend_title')}</h2>
          </div>
          {pickable.length > 0 && (
            <select
              value={trendId}
              onChange={(e) => setTrendId(e.target.value)}
              className="h-9 rounded-md border border-input bg-card px-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            >
              {pickable.map((c) => (
                <option key={c.ingredientId} value={c.ingredientId}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {trend.length < 1 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('sp_trend_empty')}
          </p>
        ) : (
          <div className="mt-4">
            <TrendChart data={trend} />
          </div>
        )}
      </StoklyCard>
    </div>
  )
}

function TrendTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-0.5 text-muted-foreground">{label}</p>
      <p className="font-mono font-semibold text-foreground">
        {formatMoney(Number(payload[0].value))}
      </p>
    </div>
  )
}

function TrendChart({ data }: { data: MonthlyPoint[] }) {
  const rows = data.map((d) => ({ label: d.month, avg: d.avg }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={rows} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(100,116,139,0.15)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={8}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<TrendTooltip />} />
        <Line
          type="monotone"
          dataKey="avg"
          stroke="hsl(165 100% 33%)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'hsl(165 100% 33%)' }}
          animationDuration={600}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
