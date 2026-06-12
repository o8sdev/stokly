'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Flame } from 'lucide-react'

// The dashboard hero: a time-of-day greeting (computed client-side, in the
// user's timezone) addressed to the business, with the sales-recording streak
// chip — the habit hook: record sales daily and the number grows; skip a day
// and it resets.
export function DashboardGreeting({
  businessName,
  streak,
  dateRange,
}: {
  businessName: string | null
  streak: number
  dateRange?: string
}) {
  const t = useTranslations('dashboard')
  // Render a stable string on the server, fill the greeting in on the client
  // (the server doesn't know the user's local hour).
  const [period, setPeriod] = useState<'morning' | 'day' | 'evening' | null>(
    null
  )
  useEffect(() => {
    const h = new Date().getHours()
    setPeriod(h < 12 ? 'morning' : h < 18 ? 'day' : 'evening')
  }, [])

  const greeting = period ? t(`greeting_${period}`) : t('greeting_day')

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {greeting}
          {businessName ? (
            <span className="text-primary">, {businessName}</span>
          ) : null}
        </h1>
        {dateRange ? (
          <p className="mt-1 text-sm text-muted-foreground">{dateRange}</p>
        ) : null}
      </div>
      {streak >= 2 && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
          <Flame className="h-3.5 w-3.5" />
          {t('streak_n', { count: streak })}
        </span>
      )}
    </div>
  )
}
