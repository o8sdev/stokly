import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import {
  resolveRange,
  RANGE_PRESETS,
  type RangePreset,
} from '@/lib/data/overview'
import { getPurchaseLog } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { RangeSelector } from '@/components/dashboard/range-selector'
import { PurchasesExplorer } from '@/components/data/purchases-explorer'

export default async function PurchasesDataPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { range?: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const preset: RangePreset = RANGE_PRESETS.includes(
    searchParams.range as RangePreset
  )
    ? (searchParams.range as RangePreset)
    : 'this_month'
  const range = resolveRange(preset)
  const rows = await getPurchaseLog(ctx.tenantId, range.from, range.to)

  return (
    <div>
      <PageHeader
        title={t('data.purchases_title')}
        description={t('data.purchases_desc')}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {range.from} — {range.to}
        </p>
        <RangeSelector />
      </div>
      <PurchasesExplorer rows={rows} />
    </div>
  )
}
