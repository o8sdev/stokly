import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { createClient } from '@/lib/supabase/server'
import { getRecipes, getDayConfirmPreview } from '@/lib/data/queries'
import { hasInitialCount } from '@/lib/data/counts'
import { PageHeader } from '@/components/layout/page-header'
import {
  SalesItemEditor,
  type MenuItem,
} from '@/components/sales/sales-item-editor'
import { SalesDayActions } from '@/components/sales/sales-day-actions'
import { NeedsInitialCount } from '@/components/sales/needs-count-guard'
import { DailySalesForm } from '@/components/sales/daily-sales-form'
import { EmptyState, MetricCard } from '@/components/ui/stokly-theme'
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
  const today = new Date().toISOString().slice(0, 10)

  // Opening inventory must exist before any sale can be recorded.
  if (!(await hasInitialCount(ctx.tenantId))) {
    return (
      <div>
        <PageHeader title={t('sales.title')} description={t('sales.subtitle')} />
        <NeedsInitialCount />
      </div>
    )
  }

  const supabase = createClient()
  const recipes = await getRecipes(ctx.tenantId)
  const menuItems: MenuItem[] = recipes
    .filter((r) => !r.is_sub_recipe)
    .map((r) => ({
      id: r.id,
      name: (locale === 'ru' ? r.name_ru : r.name_az) || r.name,
      price: Number(r.sale_price ?? 0),
    }))

  // Today's existing sale + its line items (so the editor opens pre-filled).
  const { data: todaySale } = await supabase
    .from('daily_sales')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('sale_date', today)
    .maybeSingle()
  const todayRow = todaySale as DailySale | null
  let todayItems: { recipe_id: string; quantity: number; is_comp: boolean }[] =
    []
  if (todayRow) {
    const { data: items } = await supabase
      .from('daily_sales_items')
      .select('recipe_id, quantity, is_comp')
      .eq('daily_sales_id', todayRow.id)
    todayItems = (items ?? []).map((i) => ({
      recipe_id: i.recipe_id,
      quantity: Number(i.quantity),
      is_comp: i.is_comp === true,
    }))
  }

  const todayStatus = todayRow?.status ?? 'draft'
  const todayLocked = todayStatus === 'confirmed'
  const todayPreview =
    todayRow && todayStatus === 'draft' && todayItems.length > 0
      ? await getDayConfirmPreview(ctx.tenantId, todayRow.id)
      : null

  const { data } = await supabase
    .from('daily_sales')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('sale_date', { ascending: false })
    .limit(60)
  const rows = (data as DailySale[] | null) ?? []

  // This month at a glance: revenue, recorded days (+ daily average) and the
  // value of comp / staff meals — kept clearly apart from real revenue.
  const firstOfMonth = `${today.slice(0, 7)}-01`
  const { data: monthDaysData } = await supabase
    .from('daily_sales')
    .select('id, total_amount')
    .eq('tenant_id', ctx.tenantId)
    .gte('sale_date', firstOfMonth)
    .lte('sale_date', today)
  const monthDays = monthDaysData ?? []
  const monthRevenue = monthDays.reduce(
    (sum, d) => sum + Number(d.total_amount ?? 0),
    0
  )
  let monthCompValue = 0
  if (monthDays.length > 0) {
    const { data: compItems } = await supabase
      .from('daily_sales_items')
      .select('quantity, unit_price')
      .in(
        'daily_sales_id',
        monthDays.map((d) => d.id)
      )
      .eq('is_comp', true)
    monthCompValue = (compItems ?? []).reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.unit_price ?? 0),
      0
    )
  }
  const monthAvg = monthDays.length > 0 ? monthRevenue / monthDays.length : 0

  return (
    <div>
      <PageHeader title={t('sales.title')} description={t('sales.subtitle')} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label={t('sales.month_revenue')}
          value={monthRevenue.toFixed(2)}
          unit="AZN"
        />
        <MetricCard
          label={t('sales.month_days')}
          value={monthDays.length}
          sub={
            <span className="text-muted-foreground">
              {t('sales.month_avg', { amount: monthAvg.toFixed(2) })}
            </span>
          }
        />
        <MetricCard
          label={t('sales.month_comp')}
          value={monthCompValue.toFixed(2)}
          unit="AZN"
          sub={
            <span className="text-muted-foreground">
              {t('sales.month_comp_hint')}
            </span>
          }
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,34rem)_1fr]">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t('sales.add_for_day')} — {formatDate(today)}
          </h2>
          {menuItems.length > 0 ? (
            <div className="space-y-4">
              <SalesItemEditor
                locale={locale}
                date={today}
                menuItems={menuItems}
                initialItems={todayItems}
                note={todayRow?.note}
                locked={todayLocked}
              />
              {todayRow && (
                <SalesDayActions
                  locale={locale}
                  dayId={todayRow.id}
                  status={todayStatus}
                  preview={todayPreview}
                />
              )}
            </div>
          ) : (
            <>
              <p className="mb-3 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                {t('sales.no_menu_items')}
              </p>
              <DailySalesForm
                locale={locale}
                date={today}
                amount={todayRow?.total_amount}
                note={todayRow?.note}
                lockDate
              />
            </>
          )}
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
                      {t('sales.revenue')}
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
                        <span className="inline-flex items-center gap-2">
                          {formatDate(r.sale_date)}
                          {r.revenue_source === 'items' && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              {t('sales.itemized')}
                            </span>
                          )}
                          {r.status === 'confirmed' && (
                            <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                              {t('sales.status_confirmed')}
                            </span>
                          )}
                        </span>
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
