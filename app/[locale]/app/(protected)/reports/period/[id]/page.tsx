import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { getPeriod } from '@/lib/data/counts'
import { getTenant } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { EmailReportButton } from '@/components/reports/email-report-button'
import { PeriodReportView } from '@/components/reports/period-report-view'

export default async function PeriodReportPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const [period, tenant] = await Promise.all([
    getPeriod(ctx.tenantId, id),
    getTenant(ctx.tenantId),
  ])
  if (!period) notFound()

  return (
    <div>
      <PageHeader
        title={t('report_period.title')}
        action={<EmailReportButton locale={locale} periodId={period.id} />}
      />
      <PeriodReportView
        locale={locale}
        period={period}
        shrinkageThreshold={tenant?.shrinkage_threshold_pct ?? 10}
      />
    </div>
  )
}
