'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { setBusinessType } from '@/app/[locale]/app/(protected)/settings/actions'
import { BUSINESS_TYPES } from '@/lib/constants/business-types'
import { cn } from '@/lib/utils'

export function BusinessTypeChooser({
  locale,
  current,
}: {
  locale: string
  current: string | null
}) {
  const t = useTranslations('business_type')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // Optimistic selection so the highlight appears the instant you click,
  // without waiting for the server round-trip + refresh.
  const [optimistic, setOptimistic] = useState<string | null>(null)
  const chosen = optimistic ?? current

  function choose(key: string) {
    if (key === chosen) return
    setOptimistic(key)
    startTransition(async () => {
      await setBusinessType(locale, key)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {BUSINESS_TYPES.map((b) => {
        const selected = chosen === b.key
        return (
          <button
            key={b.key}
            type="button"
            onClick={() => choose(b.key)}
            disabled={pending}
            aria-pressed={selected}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm transition-all',
              selected
                ? 'border-primary bg-primary font-semibold text-primary-foreground shadow-md ring-2 ring-primary/40'
                : 'border-border bg-card font-medium text-foreground hover:border-primary/50 hover:bg-secondary',
              // dim the non-selected options while a save is in flight
              pending && !selected && 'opacity-50'
            )}
          >
            {selected && <Check className="h-4 w-4" />}
            {t(b.key)}
          </button>
        )
      })}
    </div>
  )
}
