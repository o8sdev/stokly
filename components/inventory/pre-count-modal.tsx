'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, AlertTriangle, AlertCircle, Receipt } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import type { PreCountInfo } from '@/lib/data/counts'

const WEEKDAYS: Record<string, string[]> = {
  az: [
    'Bazar',
    'Bazar ertəsi',
    'Çərşənbə axşamı',
    'Çərşənbə',
    'Cümə axşamı',
    'Cümə',
    'Şənbə',
  ],
  ru: [
    'Воскресенье',
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
  ],
}

function weekday(locale: string, d: string): string {
  const idx = new Date(`${d}T00:00:00.000Z`).getUTCDay()
  return (WEEKDAYS[locale] ?? WEEKDAYS.az)[idx]
}

export function PreCountModal({
  locale,
  preCount,
  onStart,
  onAddSales,
}: {
  locale: string
  preCount: PreCountInfo
  onStart: () => void
  onAddSales: () => void
}) {
  const t = useTranslations()
  const [ack, setAck] = useState(false)
  const {
    periodStart,
    periodEnd,
    daysInPeriod,
    cycleDays,
    missingSalesDates,
    hasPreviousCount,
  } = preCount

  // The first count is a baseline that sets opening inventory; the period-length
  // checks and sales reconciliation don't apply to it.
  const isBaseline = !hasPreviousCount
  const tooShort = !isBaseline && daysInPeriod < 2
  const tooLong = !isBaseline && daysInPeriod > cycleDays * 2
  const allSalesPresent = missingSalesDates.length === 0

  return (
    <div className="stokly-card mx-auto max-w-lg space-y-5 p-6">
      <h2 className="text-lg font-semibold">{t('precount.title')}</h2>

      {/* §1 — Period covered */}
      <section className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {t('precount.period_intro')}
        </p>
        <p className="font-medium">
          {formatDate(periodStart)} → {formatDate(periodEnd)}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('precount.days', { count: daysInPeriod })}
        </p>
      </section>

      {/* §2 — Baseline note, or sales check for later counts */}
      <section className="rounded-lg border border-border p-3">
        {isBaseline ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {t('precount.baseline_note')}
          </p>
        ) : allSalesPresent ? (
          <p className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {t('precount.sales_ok')}
          </p>
        ) : (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-600">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t('precount.sales_missing', { count: missingSalesDates.length })}
            </p>
            <ul className="space-y-0.5 text-sm text-muted-foreground">
              {missingSalesDates.map((d) => (
                <li key={d}>
                  • {formatDate(d)} ({weekday(locale, d)})
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={onAddSales}
                className="gap-1.5"
              >
                <Receipt className="h-4 w-4" />
                {t('precount.enter_sales')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAck(true)}
              >
                {t('precount.continue_without')}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* §3 — Period length warnings (edge cases only) */}
      {tooShort && (
        <p className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t('precount.too_short', { hours: daysInPeriod * 24 })}
        </p>
      )}
      {!tooShort && tooLong && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t('precount.too_long', { days: daysInPeriod, cycle: cycleDays })}
        </p>
      )}

      {/* §4 — Confirmation */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        {t('precount.ack')}
      </label>

      <div className="flex gap-2">
        <Button type="button" onClick={onStart} disabled={!ack}>
          {t('precount.start')}
        </Button>
        <Button asChild variant="outline" type="button">
          <Link href="/app/inventory">{t('common.cancel')}</Link>
        </Button>
      </div>
    </div>
  )
}
