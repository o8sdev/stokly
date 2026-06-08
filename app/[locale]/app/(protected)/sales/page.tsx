import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { createClient } from '@/lib/supabase/server'
import { getRecipes } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import {
  SalesItemEditor,
  type MenuItem,
} from '@/components/sales/sales-item-editor'
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
  const today = new Date().toISOString().slice(0, 10)

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
  let todayItems: { recipe_id: string; quantity: number }[] = []
  if (todayRow) {
    const { data: items } = await supabase
      .from('daily_sales_items')
      .select('recipe_id, quantity')
      .eq('daily_sales_id', todayRow.id)
    todayItems = (items ?? []).map((i) => ({
      recipe_id: i.recipe_id,
      quantity: Number(i.quantity),
    }))
  }

  const { data } = await supabase
    .from('daily_sales')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('sale_date', { ascending: false })
    .limit(60)
  const rows = (data as DailySale[] | null) ?? []

  return (
    <div>
      <PageHeader title={t('sales.title')} description={t('sales.subtitle')} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,34rem)_1fr]">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t('sales.add_for_day')} — {formatDate(today)}
          </h2>
          {menuItems.length > 0 ? (
            <SalesItemEditor
              locale={locale}
              date={today}
              menuItems={menuItems}
              initialItems={todayItems}
              note={todayRow?.note}
            />
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
