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
  const [busy, setBusy] = useState<string | null>(null)

  function choose(key: string) {
    if (key === current || pending) return
    setBusy(key)
    startTransition(async () => {
      await setBusinessType(locale, key)
      setBusy(null)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {BUSINESS_TYPES.map((b) => {
        const selected = current === b.key
        return (
          <button
            key={b.key}
            type="button"
            onClick={() => choose(b.key)}
            disabled={pending}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm transition-all disabled:cursor-not-allowed',
              selected
                ? 'border-primary bg-primary font-semibold text-primary-foreground shadow-sm ring-2 ring-primary/30'
                : 'border-border bg-card font-medium text-foreground hover:border-primary/40 hover:bg-secondary',
              busy === b.key && 'opacity-60'
            )}
          >
            {selected && <Check className="h-3.5 w-3.5" />}
            {t(b.key)}
          </button>
        )
      })}
    </div>
  )
}
