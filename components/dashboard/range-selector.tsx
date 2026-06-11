'use client'

import { useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

// Period selector for the owner's overview. Drives the `?range=` query param the
// dashboard reads on the server; defaults to "this month".
const PRESETS = ['7d', '30d', 'this_month', 'last_month'] as const

export function RangeSelector() {
  const t = useTranslations('overview')
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const active = params.get('range') ?? 'this_month'

  function pick(preset: string) {
    const sp = new URLSearchParams(params.toString())
    sp.set('range', preset)
    start(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }))
  }

  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-border bg-card p-0.5',
        pending && 'opacity-60'
      )}
    >
      {PRESETS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => pick(p)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            active === p
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t(`range_${p}`)}
        </button>
      ))}
    </div>
  )
}
