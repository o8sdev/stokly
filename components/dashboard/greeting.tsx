'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Flame } from 'lucide-react'

// Personal dashboard header: time-of-day greeting (computed client-side, in the
// user's timezone) + the sales-recording streak chip. The streak is the hook —
// record sales every day and the number grows; skip a day and it resets.
export function DashboardGreeting({
  businessName,
  streak,
}: {
  businessName: string | null
  streak: number
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
    <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {greeting}
        {businessName ? (
          <span className="font-semibold text-foreground">
            , {businessName}
          </span>
        ) : null}
      </p>
      {streak >= 2 && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Flame className="h-3.5 w-3.5" />
          {t('streak_n', { count: streak })}
        </span>
      )}
    </div>
  )
}
