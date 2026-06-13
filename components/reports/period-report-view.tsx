'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { RefreshCw, AlertTriangle, Info } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { Button } from '@/components/ui/button'
import { formatMoney, formatDate, formatQuantity } from '@/lib/utils'
import { regeneratePeriodReport } from '@/app/[locale]/app/(protected)/reports/period/[id]/actions'
import type { CountPeriod } from '@/types/database'
import { computePeriodKpis } from '@/lib/calculations/period-report'
import type {
  PeriodReportData,
  Discrepancy,
} from '@/lib/calculations/period-report'
import { buildShrinkageAlerts } from '@/lib/calculations/shrinkage'

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stokly-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export function PeriodReportView({
  locale,
  period,
  shrinkageThreshold,
}: {
  locale: string
  period: CountPeriod
  shrinkageThreshold: number
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  const data = period.report_data as unknown as PeriodReportData | null

  function regenerate() {
    setDone(false)
    startTransition(async () => {
      await regeneratePeriodReport(locale, period.id)
      setDone(true)
      router.refresh()
    })
  }

  function discText(d: Discrepancy): string {
    if (d.type === 'missing_sales') {
      return t('report_period.disc_missing_sales', {
        count: d.dates?.length ?? 0,
        dates: (d.dates ?? []).map((x) => formatDate(x)).join(', '),
      })
    }
    return t('report_period.disc_negative_usage', {
      name: d.ingredient_name ?? '',
    })
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('report_period.no_data')}
      </p>
    )
  }

  const kpis = computePeriodKpis(data)

  const fc =
    data.food_cost_percent === null ? '—' : `${data.food_cost_percent}%`

  // Theoretical figures only exist on reports built after itemized sales
  // shipped; older stored reports simply omit them.
  const itemized = data.has_itemized_sales === true
  const theoFc =
    data.theoretical_food_cost_percent == null
      ? '—'
      : `${data.theoretical_food_cost_percent}%`
  const varianceTotal =
    Math.round((data.cogs - (data.theoretical_cogs ?? 0)) * 100) / 100
  const varianceTone =
    varianceTotal > 0.005
      ? 'text-red-600'
      : varianceTotal < -0.005
        ? 'text-emerald-600'
        : 'text-muted-foreground'
  const signed = (n: number): string => (n > 0 ? `+${formatMoney(n)}` : formatMoney(n))
  // Ingredients used materially more than their recipes predict (possible
  // over-portioning / unrecorded waste / theft) — only when sales are itemized.
  const shrinkage = itemized
    ? buildShrinkageAlerts(data.lines, shrinkageThreshold)
    : []

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {formatDate(data.period_start)} → {formatDate(data.period_end)} ·{' '}
          {t('precount.days', { count: data.days_in_period })}
        </p>
        <div className="flex items-center gap-2">
          {done && (
            <span className="text-sm text-green-600">
              {t('report_period.regenerated')} ✓
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={regenerate}
            disabled={pending}
            className="gap-1.5"
          >
            <RefreshCw
              className={'h-4 w-4' + (pending ? ' animate-spin' : '')}
            />
            {t('report_period.regenerate')}
          </Button>
        </div>
      </div>

      {/* Missing-sales banner */}
      {period.has_missing_sales && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t('report_period.missing_banner', {
              count: period.missing_sales_dates.length,
            })}
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/app/sales">{t('report_period.enter_sales')}</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={regenerate}
              disabled={pending}
            >
              {t('report_period.regenerate')}
            </Button>
          </div>
        </div>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label={t('report_period.sales')}
          value={formatMoney(data.sales_total)}
        />
        <MetricCard label={t('report_period.cogs')} value={formatMoney(data.cogs)} />
        <MetricCard label={t('report_period.food_cost')} value={fc} />
        <MetricCard
          label={t('report_period.waste')}
          value={formatMoney(data.waste_value)}
        />
        <MetricCard
          label={t('report_period.opening')}
          value={formatMoney(data.opening_value)}
        />
        <MetricCard
          label={t('report_period.deliveries')}
          value={formatMoney(data.deliveries_value)}
        />
        <MetricCard
          label={t('report_period.closing')}
          value={formatMoney(data.closing_value)}
        />
      </div>

      {/* KPIs (Tier C1–C3): inventory turnover, days-on-hand, waste % */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
          {t('report_period.kpis_title')}
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <MetricCard
            label={t('report_period.turnover')}
            value={
              kpis.inventory_turnover != null
                ? `${kpis.inventory_turnover}×`
                : '—'
            }
          />
          <MetricCard
            label={t('report_period.days_on_hand')}
            value={kpis.days_on_hand != null ? String(kpis.days_on_hand) : '—'}
          />
          <MetricCard
            label={t('report_period.waste_percent')}
            value={kpis.waste_percent != null ? `${kpis.waste_percent}%` : '—'}
          />
        </div>
      </div>

      {/* Discrepancies */}
      {data.discrepancies.length > 0 && (
        <div className="space-y-2">
          {data.discrepancies.map((d, i) => (
            <p
              key={i}
              className={
                'flex items-start gap-2 rounded-lg p-3 text-sm ' +
                (d.severity === 'warning'
                  ? 'bg-amber-500/10 text-amber-700'
                  : 'bg-secondary text-muted-foreground')
              }
            >
              {d.severity === 'warning' ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              {discText(d)}
            </p>
          ))}
        </div>
      )}

      {/* Theoretical vs actual (only when sales were itemized) */}
      {itemized && (
        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <h3 className="text-sm font-semibold">
            {t('report_period.variance_title')}
          </h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {t('report_period.theoretical_food_cost')}
              </p>
              <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
                {theoFc}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t('report_period.actual_food_cost')}
              </p>
              <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
                {fc}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t('report_period.variance')}
              </p>
              <p
                className={
                  'mt-0.5 font-mono text-lg font-semibold tabular-nums ' +
                  varianceTone
                }
              >
                {signed(varianceTotal)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t('report_period.variance_hint')}
          </p>
        </div>
      )}

      {/* Shrinkage alerts — ingredients used well over what recipes predict */}
      {shrinkage.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50/60 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {t('report_period.shrinkage_title')}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('report_period.shrinkage_hint', { pct: shrinkageThreshold })}
          </p>
          <ul className="mt-3 space-y-1.5">
            {shrinkage.map((s) => (
              <li
                key={s.ingredient_id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="font-medium">{s.name}</span>
                <span className="flex items-center gap-3 font-mono tabular-nums">
                  <span className="font-semibold text-red-600">
                    {t('report_period.shrinkage_over_pct', {
                      pct: s.variance_pct,
                    })}
                  </span>
                  <span className="text-muted-foreground">
                    +{formatQuantity(s.variance_qty)} {s.unit}
                  </span>
                  <span className="font-semibold">
                    {formatMoney(s.variance_value)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Usage lines */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-semibold">
                {t('report_period.ingredient')}
              </th>
              <th className="px-3 py-3 text-right font-semibold">
                {t('report_period.opening')}
              </th>
              <th className="px-3 py-3 text-right font-semibold">
                {t('report_period.delivered')}
              </th>
              <th className="px-3 py-3 text-right font-semibold">
                {t('report_period.waste')}
              </th>
              <th className="px-3 py-3 text-right font-semibold">
                {t('report_period.closing')}
              </th>
              <th className="px-3 py-3 text-right font-semibold">
                {t('report_period.usage')}
              </th>
              {itemized && (
                <>
                  <th className="px-3 py-3 text-right font-semibold">
                    {t('report_period.theoretical')}
                  </th>
                  <th className="px-3 py-3 text-right font-semibold">
                    {t('report_period.variance')}
                  </th>
                </>
              )}
              <th className="px-4 py-3 text-right font-semibold">
                {t('report_period.value')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l) => {
              const vQty = l.variance_qty ?? 0
              const vTone =
                vQty > 0.005
                  ? 'text-red-600'
                  : vQty < -0.005
                    ? 'text-emerald-600'
                    : 'text-muted-foreground'
              return (
                <tr
                  key={l.ingredient_id}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-4 py-2 font-medium">{l.name}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {l.opening_qty}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {l.delivered_qty}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {l.waste_qty}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {l.closing_qty}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {l.usage_qty}
                  </td>
                  {itemized && (
                    <>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                        {l.theoretical_qty ?? 0}
                      </td>
                      <td
                        className={
                          'px-3 py-2 text-right font-mono tabular-nums ' + vTone
                        }
                      >
                        {vQty > 0 ? `+${vQty}` : vQty}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {formatMoney(l.usage_value)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: version + generated time */}
      <p className="text-xs text-muted-foreground">
        {t('report_period.version', { version: period.regeneration_count })}
        {period.report_generated_at
          ? ` · ${formatDate(period.report_generated_at)}`
          : ''}
      </p>
    </div>
  )
}
