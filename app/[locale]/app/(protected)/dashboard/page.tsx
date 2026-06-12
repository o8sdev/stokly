import { Suspense } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { tenantHasFeature } from '@/lib/admin/entitlements'
import { getTenant, getRecipes } from '@/lib/data/queries'
import {
  getSalesStreak,
  resolveRange,
  RANGE_PRESETS,
  type RangePreset,
} from '@/lib/data/overview'
import { getLastCountInfo } from '@/lib/data/counts'
import {
  StatCardsSkeleton,
  CardSkeleton,
  CardGridSkeleton,
} from '@/components/ui/skeletons'
import { GettingStarted } from '@/components/dashboard/getting-started'
import { CountReminder } from '@/components/dashboard/count-reminder'
import { DashboardGreeting } from '@/components/dashboard/greeting'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { RangeSelector } from '@/components/dashboard/range-selector'
import {
  OverviewSection,
  PanelsSection,
  OpsSection,
} from '@/components/dashboard/dashboard-sections'

/* The owner's command center, streamed: the shell (greeting, quick actions,
   range selector) renders immediately from a handful of cheap lookups; the
   KPI band, panels and operational widgets arrive progressively via Suspense
   so the page feels instant even on a slow connection. */
export default async function DashboardPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { range?: string }
}) {
  setRequestLocale(locale)
  const ctx = await requireTenant(locale)

  const preset: RangePreset = RANGE_PRESETS.includes(
    searchParams.range as RangePreset
  )
    ? (searchParams.range as RangePreset)
    : 'this_month'
  const range = resolveRange(preset)

  // Cheap meta for the shell; everything heavy streams below.
  const [tenant, recipes, lastCount, streak] = await Promise.all([
    getTenant(ctx.tenantId),
    getRecipes(ctx.tenantId),
    getLastCountInfo(ctx.tenantId),
    getSalesStreak(ctx.tenantId),
  ])
  const needsOnboarding =
    !tenant?.onboarding_dismissed_at &&
    (recipes.length === 0 || lastCount.lastCountDate === null)
  const showGettingStarted =
    needsOnboarding && (await tenantHasFeature(ctx.tenantId, 'onboarding_screen'))

  return (
    <div>
      {showGettingStarted && (
        <div className="mb-6">
          <GettingStarted locale={locale} />
        </div>
      )}

      {/* Hero: greeting + streak, then the daily habit row. */}
      <DashboardGreeting
        businessName={tenant?.name ?? null}
        streak={streak}
        dateRange={`${range.from} — ${range.to}`}
      />
      <div className="mt-4">
        <QuickActions />
      </div>

      <CountReminder info={lastCount} />

      <div className="mb-4 mt-5 flex items-center justify-end">
        <RangeSelector />
      </div>

      <Suspense
        fallback={
          <>
            <StatCardsSkeleton count={6} />
            <div className="mt-4">
              <CardSkeleton lines={6} />
            </div>
          </>
        }
      >
        <OverviewSection tenantId={ctx.tenantId} range={range} />
      </Suspense>

      <Suspense
        fallback={
          <div className="mt-4">
            <CardGridSkeleton count={3} />
          </div>
        }
      >
        <PanelsSection tenantId={ctx.tenantId} range={range} />
      </Suspense>

      <Suspense
        fallback={
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CardSkeleton lines={6} />
            </div>
            <CardSkeleton lines={6} />
          </div>
        }
      >
        <OpsSection
          tenantId={ctx.tenantId}
          locale={locale}
          userId={ctx.userId}
          email={ctx.email}
        />
      </Suspense>
    </div>
  )
}
