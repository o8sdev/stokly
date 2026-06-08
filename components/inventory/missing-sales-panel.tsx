'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import { saveDailySalesBatch } from '@/app/[locale]/app/(protected)/sales/actions'

interface Entry {
  amount: string
  note: string
}

// Slide-over for entering sales on the days a count period is missing them.
// One tab per date; "save all" upserts every filled day at once.
export function MissingSalesPanel({
  locale,
  dates,
  open,
  onClose,
  onSaved,
}: {
  locale: string
  dates: string[]
  open: boolean
  onClose: () => void
  onSaved: (savedDates: string[]) => void
}) {
  const t = useTranslations()
  const [active, setActive] = useState(0)
  const [values, setValues] = useState<Record<string, Entry>>({})
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (active >= dates.length) setActive(0)
  }, [dates, active])

  if (!open) return null

  const current = dates[active]

  function setVal(date: string, field: keyof Entry, v: string) {
    setValues((prev) => ({
      ...prev,
      [date]: {
        amount: prev[date]?.amount ?? '',
        note: prev[date]?.note ?? '',
        [field]: v,
      },
    }))
  }

  function saveAll() {
    setError(false)
    const entries = dates
      .map((d) => ({ date: d, raw: values[d]?.amount ?? '', note: values[d]?.note }))
      .filter((e) => e.raw.trim() !== '' && Number.isFinite(Number(e.raw)))
      .map((e) => ({ date: e.date, amount: Number(e.raw), note: e.note }))

    if (entries.length === 0) {
      setError(true)
      return
    }
    startTransition(async () => {
      const res = await saveDailySalesBatch(locale, entries)
      if (res.error) {
        setError(true)
        return
      }
      onSaved(entries.map((e) => e.date))
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-semibold">{t('precount.panel_title')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {dates.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            {t('precount.sales_ok')}
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 overflow-x-auto border-b border-border px-4 py-2">
              {dates.map((d, i) => {
                const filled = (values[d]?.amount ?? '').trim() !== ''
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setActive(i)}
                    className={
                      'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ' +
                      (i === active
                        ? 'bg-primary text-primary-foreground'
                        : filled
                          ? 'bg-green-500/15 text-green-700'
                          : 'bg-secondary text-muted-foreground hover:text-foreground')
                    }
                  >
                    {formatDate(d).replace(/\s\d{4}$/, '')}
                  </button>
                )
              })}
            </div>

            {current && (
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <p className="text-sm font-medium">{formatDate(current)}</p>
                <div className="space-y-2">
                  <Label htmlFor="panel_amount">{t('sales.amount')}</Label>
                  <Input
                    id="panel_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={values[current]?.amount ?? ''}
                    onChange={(e) => setVal(current, 'amount', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panel_note">{t('sales.note')}</Label>
                  <Input
                    id="panel_note"
                    value={values[current]?.note ?? ''}
                    onChange={(e) => setVal(current, 'note', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="border-t border-border p-4">
              {error && (
                <p className="mb-2 text-sm text-destructive">
                  {t('precount.panel_error')}
                </p>
              )}
              <Button
                type="button"
                onClick={saveAll}
                disabled={pending}
                className="w-full"
              >
                {pending ? t('common.saving') : t('precount.save_all')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
