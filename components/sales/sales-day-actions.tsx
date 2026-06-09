'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Lock, ShieldCheck, Undo2, AlertTriangle } from 'lucide-react'
import {
  confirmDailySales,
  voidDailySales,
} from '@/app/[locale]/app/(protected)/sales/actions'
import type { DayConfirmPreview } from '@/lib/data/queries'
import { formatMoney } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function SalesDayActions({
  locale,
  dayId,
  status,
  preview,
}: {
  locale: string
  dayId: string
  status: 'draft' | 'confirmed'
  preview?: DayConfirmPreview | null
}) {
  const t = useTranslations('sales')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [askVoid, setAskVoid] = useState(false)
  const [err, setErr] = useState(false)

  function confirmDay() {
    setErr(false)
    startTransition(async () => {
      const res = await confirmDailySales(locale, dayId)
      if (res?.error) setErr(true)
      else router.refresh()
    })
  }
  function voidDay() {
    setErr(false)
    startTransition(async () => {
      const res = await voidDailySales(locale, dayId)
      if (res?.error) setErr(true)
      else {
        setAskVoid(false)
        router.refresh()
      }
    })
  }

  // ── Confirmed → locked, with a void option ──────────────────────────────
  if (status === 'confirmed') {
    return (
      <div className="rounded-xl border border-green-600/40 bg-green-500/[0.06] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-green-700">
          <ShieldCheck className="h-4 w-4" />
          {t('confirmed_locked')}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('confirmed_hint')}
        </p>
        {askVoid ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-foreground">{t('void_confirm')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={voidDay}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
              >
                <Undo2 className="h-3.5 w-3.5" />
                {pending ? t('voiding') : t('void_yes')}
              </button>
              <button
                type="button"
                onClick={() => setAskVoid(false)}
                disabled={pending}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAskVoid(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
          >
            <Undo2 className="h-3.5 w-3.5" />
            {t('void')}
          </button>
        )}
        {err && <p className="mt-2 text-sm text-destructive">{t('error')}</p>}
      </div>
    )
  }

  // ── Draft → review the impact, then confirm & lock ──────────────────────
  const lines = preview?.lines ?? []
  if (lines.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        {t('confirm_needs_items')}
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Lock className="h-4 w-4 text-primary" />
        {t('confirm_title')}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{t('confirm_hint')}</p>

      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-semibold">
                {t('recipes_ingredient')}
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                {t('deduct')}
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                {t('on_hand')}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr
                key={l.ingredient_id}
                className="border-b border-border/60 last:border-0"
              >
                <td className="px-3 py-1.5 font-medium">{l.ingredient_name}</td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                  −{l.quantity} {l.unit}
                </td>
                <td
                  className={cn(
                    'px-3 py-1.5 text-right font-mono tabular-nums',
                    l.short ? 'text-amber-600' : 'text-muted-foreground'
                  )}
                >
                  {l.current_stock} {l.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {preview?.any_short && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t('confirm_short_warning')}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {t('cogs')}:{' '}
          <span className="font-mono font-semibold text-foreground">
            {formatMoney(preview?.cogs ?? 0)}
          </span>
        </span>
        <button
          type="button"
          onClick={confirmDay}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Lock className="h-4 w-4" />
          {pending ? t('confirming') : t('confirm_lock')}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{t('error')}</p>}
    </div>
  )
}
