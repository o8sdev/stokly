import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { DailySalesForm } from '@/components/sales/daily-sales-form'
import { EmptyState } from '@/components/ui/stokly-theme'
import { Link } from '@/lib/i18n/navigation'
import { formatMoney, formatDate } from '@/lib/utils'
import type { DailySale } from '@/types/database'

export default async function SalesPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const supabase = createClient()
  const { data } = await supabase
    .from('daily_sales')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('sale_date', { ascending: false })
    .limit(60)
  const rows = (data as DailySale[] | null) ?? []
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <PageHeader
        title={t('sales.title')}
        description={t('sales.subtitle')}
      />

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t('sales.add_for_day')}
          </h2>
          <DailySalesForm locale={locale} date={today} />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t('sales.recent')}
          </h2>
          {rows.length === 0 ? (
            <EmptyState message={t('sales.empty')} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">{t('sales.date')}</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      {t('sales.amount')}
                    </th>
                    <th className="px-4 py-3 font-semibold">{t('sales.note')}</th>
                    <th className="w-16 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium">
                        {formatDate(r.sale_date)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                        {formatMoney(r.total_amount)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {r.note ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/app/sales/${r.sale_date}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {t('common.edit')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
