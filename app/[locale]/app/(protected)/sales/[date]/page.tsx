import { notFound } from 'next/navigation'
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
import { Link } from '@/lib/i18n/navigation'
import { formatDate } from '@/lib/utils'
import type { DailySale } from '@/types/database'

export default async function SalesDatePage({
  params: { locale, date },
}: {
  params: { locale: string; date: string }
}) {
  setRequestLocale(locale)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  if (!(await hasInitialCount(ctx.tenantId))) {
    return (
      <div>
        <PageHeader title={`${t('sales.title')} — ${formatDate(date)}`} />
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

  const { data: sale } = await supabase
    .from('daily_sales')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('sale_date', date)
    .maybeSingle()
  const existing = sale as DailySale | null

  let initialItems: { recipe_id: string; quantity: number; is_comp: boolean }[] =
    []
  const status = existing?.status ?? 'draft'
  const locked = status === 'confirmed'
  if (existing) {
    const { data: items } = await supabase
      .from('daily_sales_items')
      .select('recipe_id, quantity, is_comp')
      .eq('daily_sales_id', existing.id)
    initialItems = (items ?? []).map((i) => ({
      recipe_id: i.recipe_id,
      quantity: Number(i.quantity),
      is_comp: i.is_comp === true,
    }))
  }

  // Inventory impact preview for the confirm screen (drafts with items only).
  const preview =
    existing && status === 'draft' && initialItems.length > 0
      ? await getDayConfirmPreview(ctx.tenantId, existing.id)
      : null

  return (
    <div>
      <PageHeader title={`${t('sales.title')} — ${formatDate(date)}`} />
      <Link
        href="/app/sales"
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        ← {t('sales.title')}
      </Link>
      <div className="max-w-2xl space-y-4">
        {menuItems.length > 0 ? (
          <>
            <SalesItemEditor
              locale={locale}
              date={date}
              menuItems={menuItems}
              initialItems={initialItems}
              note={existing?.note}
              locked={locked}
            />
            {existing && (
              <SalesDayActions
                locale={locale}
                dayId={existing.id}
                status={status}
                preview={preview}
              />
            )}
          </>
        ) : (
          <>
            <p className="mb-3 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              {t('sales.no_menu_items')}
            </p>
            <DailySalesForm
              locale={locale}
              date={date}
              amount={existing?.total_amount}
              note={existing?.note}
              lockDate
            />
          </>
        )}
      </div>
    </div>
  )
}
