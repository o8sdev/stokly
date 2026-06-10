import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { tenantHasFeature } from '@/lib/admin/entitlements'
import { getLocationReport } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { formatMoney } from '@/lib/utils'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function ByLocationReportPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { from?: string; to?: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  if (!(await tenantHasFeature(ctx.tenantId, 'multi_location'))) {
    return (
      <div>
        <PageHeader title={t('reports.by_location')} />
        <div className="stokly-card p-8 text-center text-sm text-muted-foreground">
          {t('by_location.not_in_plan')}
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = `${today.slice(0, 7)}-01`
  const from = DATE_RE.test(searchParams.from ?? '')
    ? (searchParams.from as string)
    : firstOfMonth
  const to = DATE_RE.test(searchParams.to ?? '') ? (searchParams.to as string) : today

  const rows = await getLocationReport(ctx.tenantId, from, to)
  const inputCls =
    'flex h-9 rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15'

  return (
    <div>
      <PageHeader
        title={t('reports.by_location')}
        description={t('by_location.subtitle')}
      />

      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1">
          <label htmlFor="from" className="text-xs font-medium text-muted-foreground">
            {t('inventory.from')}
          </label>
          <input id="from" name="from" type="date" defaultValue={from} className={inputCls} />
        </div>
        <div className="space-y-1">
          <label htmlFor="to" className="text-xs font-medium text-muted-foreground">
            {t('inventory.to')}
          </label>
          <input id="to" name="to" type="date" defaultValue={to} className={inputCls} />
        </div>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t('inventory.apply')}
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          {t('by_location.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{t('by_location.col_location')}</th>
                <th className="px-3 py-3 text-right font-semibold">{t('by_location.col_stock_value')}</th>
                <th className="px-3 py-3 text-right font-semibold">{t('by_location.col_sales')}</th>
                <th className="px-3 py-3 text-right font-semibold">{t('by_location.col_waste')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{r.name}</span>
                    {r.kind && (
                      <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t(`locations.kind_${r.kind}`)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatMoney(r.stock_value)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                    {r.is_consumption_point ? formatMoney(r.sales_value) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                    {r.is_consumption_point ? formatMoney(r.waste_value) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
