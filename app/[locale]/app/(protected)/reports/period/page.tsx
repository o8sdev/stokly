import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AlertTriangle } from 'lucide-react'
import { requireTenant } from '@/lib/auth/tenant'
import { listPeriods } from '@/lib/data/counts'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/stokly-theme'
import { Link } from '@/lib/i18n/navigation'
import { formatDate } from '@/lib/utils'
import type { PeriodReportData } from '@/lib/calculations/period-report'

export default async function PeriodReportsListPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)
  const periods = await listPeriods(ctx.tenantId)

  return (
    <div>
      <PageHeader
        title={t('report_period.list_title')}
        description={t('report_period.list_subtitle')}
      />

      {periods.length === 0 ? (
        <EmptyState message={t('report_period.empty')} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">
                  {t('report_period.period')}
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  {t('precount.period')}
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  {t('report_period.food_cost')}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => {
                const data = p.report_data as unknown as PeriodReportData | null
                const fc =
                  data?.food_cost_percent == null
                    ? '—'
                    : `${data.food_cost_percent}%`
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {formatDate(p.period_start)} → {formatDate(p.period_end)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {p.days_in_period}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {fc}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center gap-2">
                        {p.has_missing_sales && (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <Link
                          href={`/app/reports/period/${p.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {t('common.view')}
                        </Link>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
