'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import {
  Check,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  MapPin,
  Minus,
  Plus,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import {
  submitStockCount,
  type InventoryActionResult,
} from '@/app/[locale]/app/(protected)/inventory/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { CountItem } from './stock-count-form'

const keyFor = (loc: string, ing: string): string => `${loc}__${ing}`

// Day-0 (opening) stock count — a strict, step-by-step wizard. One step per
// location, EVERY ingredient must be entered (even 0 — no silent defaulting),
// the count can only be submitted on the final review step, and an opening
// count is irreversible so it asks for confirmation first.
export function OpeningCountWizard({
  locale,
  items,
  locations,
}: {
  locale: string
  items: CountItem[]
  locations: { id: string; name: string }[]
}) {
  const t = useTranslations()
  const formRef = useRef<HTMLFormElement>(null)
  const [counts, setCounts] = useState<Record<string, string>>({})
  // Steps 0..locations.length-1 are locations; the last index is the review step.
  const [step, setStep] = useState(0)
  const [countDate, setCountDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const total = locations.length
  const isReview = step >= total
  const loc = !isReview ? locations[step] : null

  const action = submitStockCount.bind(null, locale)
  const [state, formAction] = useFormState<InventoryActionResult, FormData>(
    action,
    {}
  )
  // On error the action returns instead of redirecting — re-enable the button.
  useEffect(() => {
    if (state?.error) setSubmitting(false)
  }, [state])

  const hasValue = (locId: string, ingId: string): boolean => {
    const v = counts[keyFor(locId, ingId)]
    return v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0
  }
  const isLocComplete = (locId: string): boolean =>
    items.every((it) => hasValue(locId, it.id))
  const filledInLoc = (locId: string): number =>
    items.filter((it) => hasValue(locId, it.id)).length

  const currentComplete = loc ? isLocComplete(loc.id) : true
  const allComplete = locations.every((l) => isLocComplete(l.id))

  // Every (location × ingredient) line, including explicit zeros.
  const payload = useMemo(
    () =>
      JSON.stringify({
        count_date: countDate,
        lines: locations.flatMap((l) =>
          items.map((it) => ({
            ingredient_id: it.id,
            location_id: l.id,
            quantity: Number(counts[keyFor(l.id, it.id)] ?? 0),
          }))
        ),
      }),
    [counts, countDate, locations, items]
  )

  function setVal(locId: string, ingId: string, v: string) {
    setCounts((p) => ({ ...p, [keyFor(locId, ingId)]: v }))
  }
  function bump(locId: string, ingId: string, delta: number) {
    setCounts((p) => {
      const cur = Number(p[keyFor(locId, ingId)] ?? '')
      const base = Number.isFinite(cur) ? cur : 0
      const next = Math.max(0, Math.round((base + delta) * 1000) / 1000)
      return { ...p, [keyFor(locId, ingId)]: String(next) }
    })
  }
  function fillRemainingZero(locId: string) {
    setCounts((p) => {
      const next = { ...p }
      for (const it of items) {
        const k = keyFor(locId, it.id)
        if (next[k] === undefined || next[k] === '') next[k] = '0'
      }
      return next
    })
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onKeyDown={(e) => {
        // Don't let Enter inside a number field submit the whole count.
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT')
          e.preventDefault()
      }}
      className="space-y-4"
    >
      <input type="hidden" name="payload" value={payload} />

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <p className="text-sm font-semibold">{t('inventory.opening_title')}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('inventory.opening_intro')}
        </p>
      </div>

      {/* Progress rail: a pill per location + a final review pill. */}
      <div className="flex items-center gap-1.5">
        {locations.map((l, i) => (
          <div key={l.id} className="flex flex-1 items-center gap-1.5">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                isLocComplete(l.id)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : i === step
                    ? 'border-primary text-primary'
                    : 'border-border text-muted-foreground'
              )}
            >
              {isLocComplete(l.id) ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={cn(
                'hidden truncate text-xs font-medium sm:inline',
                i === step ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {l.name}
            </span>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </div>
        ))}
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
            isReview ? 'border-primary text-primary' : 'border-border text-muted-foreground'
          )}
        >
          <Check className="h-4 w-4" />
        </span>
      </div>

      {/* Location step */}
      {!isReview && loc && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{loc.name}</h2>
              <span className="text-xs text-muted-foreground">
                {t('inventory.opening_step_of', { n: step + 1, total })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {filledInLoc(loc.id)}/{items.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillRemainingZero(loc.id)}
              >
                {t('inventory.opening_fill_zero')}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('inventory.opening_all_required')}
          </p>

          <div className="space-y-2">
            {items.map((it) => {
              const k = keyFor(loc.id, it.id)
              const v = counts[k] ?? ''
              const filled = v !== ''
              return (
                <div
                  key={it.id}
                  className={cn(
                    'flex min-h-[60px] items-center justify-between gap-3 rounded-lg border border-l-2 bg-card p-3 transition-colors',
                    filled ? 'border-l-primary' : 'border-l-amber-400'
                  )}
                >
                  <p className="min-w-0 truncate text-base font-medium">
                    {it.name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => bump(loc.id, it.id, -1)}
                      aria-label="−"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors active:scale-95 hover:bg-secondary"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.001"
                      min="0"
                      value={v}
                      onChange={(e) => setVal(loc.id, it.id, e.target.value)}
                      placeholder="—"
                      className={cn(
                        'h-11 w-20 text-right font-mono text-[22px] tabular-nums',
                        !filled && 'border-amber-400 placeholder:text-amber-500'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => bump(loc.id, it.id, 1)}
                      aria-label="+"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors active:scale-95 hover:bg-secondary"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-sm text-muted-foreground">
                      {it.unit}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Review step — the only place the count can be submitted. */}
      {isReview && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            {t('inventory.opening_review')}
          </h2>
          <div className="space-y-2">
            <Label htmlFor="count_date">{t('inventory.count_date')}</Label>
            <Input
              id="count_date"
              type="date"
              value={countDate}
              onChange={(e) => setCountDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="space-y-2">
            {locations.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setStep(locations.findIndex((x) => x.id === l.id))}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/50"
              >
                <span className="flex items-center gap-2 font-medium">
                  {isLocComplete(l.id) ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  {l.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {filledInLoc(l.id)}/{items.length} {t('inventory.opening_items')}
                </span>
              </button>
            ))}
          </div>
          {!allComplete && (
            <p className="text-sm text-amber-600">
              {t('inventory.opening_incomplete')}
            </p>
          )}
        </div>
      )}

      {state?.error && (
        <p className="text-sm text-destructive">{t('common.error')}</p>
      )}

      {/* Footer nav */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-2 border-t bg-background p-4 md:mx-0 md:rounded-lg md:border">
        {step === 0 ? (
          <Button asChild variant="outline" type="button">
            <Link href="/app/inventory">{t('common.cancel')}</Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
        )}

        {!isReview ? (
          <Button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!currentComplete}
            className="gap-1.5"
          >
            {t('common.next')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!allComplete}
          >
            {t('inventory.opening_submit')}
          </Button>
        )}
      </div>

      {/* Irreversible — confirm before writing the opening baseline. */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !submitting && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('inventory.opening_confirm_title')}
            </DialogTitle>
            <DialogDescription>
              {t('inventory.opening_confirm_body')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              disabled={submitting || !allComplete}
              onClick={() => {
                setSubmitting(true)
                formRef.current?.requestSubmit()
              }}
            >
              {submitting
                ? t('common.saving')
                : t('inventory.opening_confirm_cta')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
