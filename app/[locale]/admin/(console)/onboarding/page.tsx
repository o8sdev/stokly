import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { getOnboardingProgressBatch, MILESTONE_COUNT } from '@/lib/admin/onboarding'
import { Link } from '@/lib/i18n/navigation'
import { OnboardingTable, type OnbRow } from '@/components/admin/onboarding-table'
import { cn } from '@/lib/utils'

type SP = Record<string, string | string[] | undefined>
const DAY = 86400000
const TABS = ['all', 'stuck', 'this_week', 'completed'] as const

export default async function AdminOnboardingPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: SP
}) {
  setRequestLocale(locale)
  await requirePlatformAdmin(locale)
  const t = await getTranslations('admin.onboarding')
  const tab = (typeof searchParams.tab === 'string' ? searchParams.tab : 'all')

  const supabase = createClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, created_at, last_active_at, status')
    .in('status', ['trial', 'active'])
    .order('created_at', { ascending: false })
    .limit(500)
  const list = tenants ?? []
  const progress = await getOnboardingProgressBatch(list.map((x) => x.id))
  const byId = new Map(progress.map((p) => [p.tenantId, p]))
  const now = Date.now()

  const items = list.map((tn) => ({
    tn,
    p: byId.get(tn.id),
    days: Math.floor((now - new Date(tn.created_at).getTime()) / DAY),
  }))

  // Summary.
  const inTrial = list.filter((x) => x.status === 'trial').length
  const completedAll = items.filter(
    (x) => (x.p?.completedCount ?? 0) === MILESTONE_COUNT
  ).length
  const stuckCount = items.filter((x) => x.p?.isStuck).length
  const completedItems = items.filter(
    (x) => (x.p?.completedCount ?? 0) === MILESTONE_COUNT && x.p?.lastCompletedAt
  )
  const avgDays = completedItems.length
    ? Math.round(
        completedItems.reduce(
          (s, x) =>
            s +
            (new Date(x.p!.lastCompletedAt!).getTime() -
              new Date(x.tn.created_at).getTime()) /
              DAY,
          0
        ) / completedItems.length
      )
    : 0

  // Filter tabs.
  let filtered = items
  if (tab === 'stuck') filtered = items.filter((x) => x.p?.isStuck)
  else if (tab === 'this_week') filtered = items.filter((x) => x.days <= 7)
  else if (tab === 'completed')
    filtered = items.filter((x) => (x.p?.completedCount ?? 0) === MILESTONE_COUNT)

  const rows: OnbRow[] = filtered.map((x) => ({
    id: x.tn.id,
    name: x.tn.name,
    daysInTrial: x.days,
    completedCount: x.p?.completedCount ?? 1,
    currentStep: x.p?.currentStep ?? null,
    stuckDays: x.p?.isStuck ? x.p.daysSinceProgress : null,
    lastLogin: x.tn.last_active_at,
  }))

  const summary = [
    { label: t('total_in_trial'), value: inTrial },
    { label: t('completed_all'), value: completedAll },
    { label: t('stuck_48'), value: stuckCount },
    { label: t('avg_days'), value: avgDays },
  ]

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">{t('title')}</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">{s.label}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {TABS.map((tb) => (
          <Link
            key={tb}
            href={tb === 'all' ? '/admin/onboarding' : `/admin/onboarding?tab=${tb}`}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm transition-colors',
              tab === tb ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            {t(`tab_${tb}`)}
          </Link>
        ))}
      </div>

      <OnboardingTable rows={rows} locale={locale} />
    </div>
  )
}
