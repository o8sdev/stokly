'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'
import { writeOffExpired } from '@/app/[locale]/app/(protected)/inventory/actions'

// Shown on the inventory hub when batches are past their use-by. One click
// removes all expired stock (FEFO write-off) so inventory/COGS aren't overstated.
export function ExpiredWriteOff({
  locale,
  count,
}: {
  locale: string
  count: number
}) {
  const t = useTranslations('inventory')
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (count <= 0) return null

  function run() {
    startTransition(async () => {
      await writeOffExpired(locale)
      router.refresh()
    })
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {t('expired_count', { count })}
      </span>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="shrink-0 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? t('writing_off') : t('write_off')}
      </button>
    </div>
  )
}
