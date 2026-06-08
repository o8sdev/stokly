import { getTranslations } from 'next-intl/server'
import { ClipboardCheck, AlertTriangle, AlertCircle } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { formatDate } from '@/lib/utils'
import type { LastCountInfo } from '@/lib/data/counts'

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Dashboard reminder — a nudge, never a lock. The count screen stays reachable
// from the inventory menu regardless of the state shown here.
export async function CountReminder({ info }: { info: LastCountInfo }) {
  const t = await getTranslations('dashboard.count_reminder')
  const { lastCountDate, daysSince, cycleDays } = info

  const startBtn = (
    <Link
      href="/app/inventory/count"
      className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
    >
      {t('start')}
    </Link>
  )

  // No count on record yet.
  if (lastCountDate === null || daysSince === null) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t('never')}
        </span>
        {startBtn}
      </div>
    )
  }

  // Red — significantly overdue.
  if (daysSince >= cycleDays * 1.5) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t('overdue_red', { days: daysSince })}
        </span>
        {startBtn}
      </div>
    )
  }

  // Amber — cycle reached.
  if (daysSince >= cycleDays) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t('due', { days: daysSince })}
        </span>
        {startBtn}
      </div>
    )
  }

  // Amber — approaching the cycle.
  if (daysSince >= cycleDays * 0.8) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {t('approaching', { date: formatDate(addDays(lastCountDate, cycleDays)) })}
      </div>
    )
  }

  // Subtle info — always show how long since the last count.
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
      <ClipboardCheck className="h-4 w-4 shrink-0" />
      {t('info', { days: daysSince, date: formatDate(lastCountDate) })}
    </div>
  )
}
