import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  Wallet,
  Users,
  Percent,
  TrendingDown,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { getPlans, planName } from '@/lib/admin/plans'
import {
  getMRRMetrics,
  getActiveTenantCounts,
  getTrialConversion,
  getChurnThisMonth,
  getTenantsByPlan,
  getChurnRisk,
  getRecentActivity,
  getActivityFeed,
} from '@/lib/admin/metrics'
import { getOnboardingStuck } from '@/lib/admin/onboarding'
import { refreshAdminNotifications } from '@/lib/admin/notifications'
import { MrrChart } from '@/components/admin/mrr-chart'
import { PlanDonut } from '@/components/admin/plan-donut'
import { ActivityFeed } from '@/components/admin/activity-feed'
import { HealthBadge } from '@/components/admin/health-badge'
import { formatMoney, formatRelativeTime } from '@/lib/utils'

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <p className="mt-2 font-mono text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function Panel({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string
  href?: string
  linkLabel?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-white">{title}</h2>
        {href && linkLabel && (
          <Link
            href={href}
            className="text-xs text-brand transition-opacity hover:opacity-80"
          >
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

export default async function AdminDashboardPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  await requirePlatformAdmin(locale)
  const t = await getTranslations('admin.dashboard')
  const tOnb = await getTranslations('admin.onboarding')
  const tAct = await getTranslations('admin.activity')

  // Opportunistic time-based notification refresh (idempotent, best-effort).
  await refreshAdminNotifications().catch(() => ({ inserted: 0 }))

  const [mrr, counts, conversion, churn, byPlan, plans, churnRisk, stuck, recent, feed] =
    await Promise.all([
      getMRRMetrics(),
      getActiveTenantCounts(),
      getTrialConversion(90),
      getChurnThisMonth(),
      getTenantsByPlan(),
      getPlans(),
      getChurnRisk(5),
      getOnboardingStuck(5),
      getRecentActivity(5),
      getActivityFeed(20),
    ])

  const planLabels = Object.fromEntries(
    plans.map((p) => [p.key, planName(plans, p.key, locale)])
  )
  const deltaSign = mrr.deltaAzn >= 0 ? '+' : '−'

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{t('title')}</h1>

      {/* Row 1 — metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('mrr')}
          value={formatMoney(mrr.thisMonth)}
          sub={`${deltaSign}${formatMoney(Math.abs(mrr.deltaAzn))} ${t('vs_last_month')}`}
          icon={Wallet}
        />
        <StatCard
          label={t('active_tenants')}
          value={String(counts.active)}
          sub={`${counts.paid} ${t('paid')} · ${counts.trial} ${t('on_trial')}`}
          icon={Users}
        />
        <StatCard
          label={t('trial_conversion')}
          value={`${conversion.rate}%`}
          sub={`${conversion.converted}/${conversion.total} ${t('converted')}`}
          icon={Percent}
        />
        <StatCard
          label={t('churn')}
          value={String(churn.count)}
          sub={`${formatMoney(churn.mrrLost)} ${t('mrr_lost')}`}
          icon={TrendingDown}
        />
      </div>

      {/* Row 2 — charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-3">
          <h2 className="mb-4 font-display text-base font-semibold text-white">
            {t('mrr_over_time')}
          </h2>
          <MrrChart data={mrr.series} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-2">
          <h2 className="mb-4 font-display text-base font-semibold text-white">
            {t('tenants_by_plan')}
          </h2>
          <PlanDonut data={byPlan} labels={planLabels} emptyLabel={t('no_data')} />
        </div>
      </div>

      {/* Row 3 — intelligence panels */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t('churn_risk')} href="/admin/tenants" linkLabel={t('view_all')}>
          {churnRisk.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{t('no_risk')}</p>
          ) : (
            <ul className="space-y-2.5">
              {churnRisk.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{r.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {r.lastActive
                        ? formatRelativeTime(r.lastActive, locale)
                        : t('never_logged_in')}
                    </p>
                  </div>
                  <HealthBadge score={r.score} />
                  <Link
                    href={`/admin/tenants/${r.id}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={t('onboarding_stuck')}
          href="/admin/onboarding"
          linkLabel={t('view_all')}
        >
          {stuck.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{t('none_stuck')}</p>
          ) : (
            <ul className="space-y-2.5">
              {stuck.map((s) => (
                <li key={s.tenantId} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{s.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {s.currentStep ? tOnb(`steps.${s.currentStep}`) : '—'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-medium text-orange-300">
                    {s.daysSinceProgress} {t('days')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t('recent_activity')}>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{tAct('empty')}</p>
          ) : (
            <ul className="space-y-2.5">
              {recent.map((it) => (
                <li key={it.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate text-slate-300">
                    <span className="font-medium text-white">
                      {it.tenantName ?? '—'}
                    </span>{' '}
                    {tAct(`event.${it.type}`)}
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-500">
                    {formatRelativeTime(it.createdAt, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Row 4 — activity feed */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-2 font-display text-base font-semibold text-white">
          {t('activity_feed')}
        </h2>
        <ActivityFeed items={feed} locale={locale} />
      </div>
    </div>
  )
}
