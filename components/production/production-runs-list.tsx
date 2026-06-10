'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Undo2 } from 'lucide-react'
import { voidProductionRun } from '@/app/[locale]/app/(protected)/production/actions'
import type { ProductionRunView } from '@/lib/data/queries'
import { formatMoney, formatDate, cn } from '@/lib/utils'

export function ProductionRunsList({
  locale,
  runs,
}: {
  locale: string
  runs: ProductionRunView[]
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  function voidRun(id: string) {
    setBusy(id)
    startTransition(async () => {
      await voidProductionRun(locale, id)
      setBusy(null)
      router.refresh()
    })
  }

  if (runs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {t('production.empty')}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">{t('sales.date')}</th>
            <th className="px-4 py-3 font-semibold">{t('production.output')}</th>
            <th className="px-3 py-3 text-right font-semibold">{t('production.output_qty')}</th>
            <th className="px-3 py-3 text-right font-semibold">{t('production.output_unit_cost')}</th>
            <th className="px-3 py-3 text-right font-semibold">{t('production.yield')}</th>
            <th className="w-20 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr
              key={r.id}
              className={cn('border-b border-border/60 last:border-0', r.voided && 'opacity-55')}
            >
              <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                {formatDate(r.produced_at)}
              </td>
              <td className="px-4 py-2.5">
                <span className={cn('font-medium', r.voided && 'line-through')}>
                  {r.output_name}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                {r.output_quantity} {r.output_unit}
              </td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                {formatMoney(r.output_unit_cost ?? 0)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                {r.actual_yield_percent != null
                  ? `${(r.actual_yield_percent * 100).toFixed(1)}%`
                  : '—'}
              </td>
              <td className="px-4 py-2.5 text-right">
                {r.voided ? (
                  <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('production.voided')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => voidRun(r.id)}
                    disabled={pending && busy === r.id}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    {t('production.void')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
