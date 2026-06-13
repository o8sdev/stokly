import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireTenant, canWrite } from '@/lib/auth/tenant'
import {
  resolveRange,
  RANGE_PRESETS,
  type RangePreset,
} from '@/lib/data/overview'
import { getActivityLog } from '@/lib/data/activity'
import { PageHeader } from '@/components/layout/page-header'
import { RangeSelector } from '@/components/dashboard/range-selector'
import { ActivityExplorer } from '@/components/data/activity-explorer'

// Manager/owner-only audit trail. The table's RLS already blocks staff reads;
// this redirect keeps the page itself out of their reach too.
export default async function ActivityDataPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { range?: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) redirect(`/${locale}/app/dashboard`)

  const preset: RangePreset = RANGE_PRESETS.includes(
    searchParams.range as RangePreset
  )
    ? (searchParams.range as RangePreset)
    : 'this_month'
  const range = resolveRange(preset)
  const rows = await getActivityLog(ctx.tenantId, range.from, range.to)

  return (
    <div>
      <PageHeader title={t('activity.title')} description={t('activity.desc')} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {range.from} — {range.to}
        </p>
        <RangeSelector />
      </div>
      <ActivityExplorer rows={rows} />
    </div>
  )
}
