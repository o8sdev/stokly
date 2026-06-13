'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'
import { writeOffExpired } from '@/app/[locale]/app/(protected)/inventory/actions'

// Shown on the inventory hub when batches are past their use-by. Removing
// expired stock (an 'expiry_writeoff' on each batch) requires a typed reason —
// it's an audited correction, so the operator says why before it's recorded.
export function ExpiredWriteOff({
  locale,
  count,
}: {
  locale: string
  count: number
}) {
  const t = useTranslations('inventory')
  const tc = useTranslations('common')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [armed, setArmed] = useState(false)
  const [reason, setReason] = useState('')

  if (count <= 0) return null

  function run() {
    startTransition(async () => {
      const res = await writeOffExpired(locale, reason)
      if (!res?.error) {
        setArmed(false)
        setReason('')
        router.refresh()
      }
    })
  }

  return (
    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t('expired_count', { count })}
        </span>
        {!armed && (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="shrink-0 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90"
          >
            {t('write_off')}
          </button>
        )}
      </div>
      {armed && (
        <div className="mt-2 space-y-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('writeoff_reason_label')}
            className="w-full rounded-md border border-input bg-card px-2 py-1.5 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={run}
              disabled={pending || !reason.trim()}
              className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
            >
              {pending ? t('writing_off') : t('write_off')}
            </button>
            <button
              type="button"
              onClick={() => {
                setArmed(false)
                setReason('')
              }}
              disabled={pending}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground"
            >
              {tc('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
