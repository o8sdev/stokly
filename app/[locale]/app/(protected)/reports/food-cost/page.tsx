import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { tenantHasFeature } from '@/lib/admin/entitlements'
import { logReportView } from '@/lib/business/track'
import {
  getIngredients,
  getRecipes,
  getRecipeIngredients,
  getRecipeCategories,
} from '@/lib/data/queries'
import {
  computeRecipesWithCost,
  averageFoodCostPercent,
} from '@/lib/calculations/recipe-cost'
import { PageHeader } from '@/components/layout/page-header'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  MetricCard,
  DataTable,
  MonoValue,
  FoodCostBadge,
  EmptyState,
  foodCostBand,
} from '@/components/ui/stokly-theme'
import { formatMoney } from '@/lib/utils'

export default async function FoodCostReportPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { category?: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  if (!(await tenantHasFeature(ctx.tenantId, 'report_food_cost'))) {
    return (
      <div>
        <PageHeader title={t('reports.food_cost')} />
        <div className="stokly-card p-8 text-center text-sm text-muted-foreground">
          {locale === 'ru'
            ? 'Этот отчёт не входит в ваш текущий тариф.'
            : 'Bu hesabat cari tarifinizə daxil deyil.'}
        </div>
      </div>
    )
  }
  if (!ctx.isAdmin) {
    await logReportView(ctx.tenantId, ctx.userId, 'food_cost')
  }

  const [ingredients, recipes, recipeIngredients, categories] =
    await Promise.all([
      getIngredients(ctx.tenantId),
      getRecipes(ctx.tenantId),
      getRecipeIngredients(ctx.tenantId),
      getRecipeCategories(ctx.tenantId),
    ])

  // Menu-section focus: '' = all, 'none' = uncategorised, else a category id.
  const category = searchParams.category ?? ''
  const inCategory = (r: { category_id: string | null }) =>
    category === ''
      ? true
      : category === 'none'
        ? !r.category_id
        : r.category_id === category

  // Dishes only (exclude sub-recipes), sorted most expensive food cost first.
  const rows = computeRecipesWithCost(ingredients, recipes, recipeIngredients)
    .filter((r) => !r.is_sub_recipe)
    .filter(inCategory)
    .sort((a, b) => b.foodCostPercent - a.foodCostPercent)

  const avg = averageFoodCostPercent(rows)
  const priced = rows.filter((r) => r.sale_price && r.sale_price > 0)
  const highest = priced[0]
  const lowest = priced[priced.length - 1]
  const avgBand = foodCostBand(avg)

  return (
    <div>
      <PageHeader title={t('reports.food_cost')} />

      {categories.length > 0 && (
        <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
          <div className="space-y-1">
            <label
              htmlFor="category"
              className="text-xs font-medium text-muted-foreground"
            >
              {t('recipes.category')}
            </label>
            <select
              id="category"
              name="category"
              defaultValue={category}
              className="flex h-9 rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            >
              <option value="">{t('recipes.all_categories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="none">{t('recipes.no_category')}</option>
            </select>
          </div>
          <button
            type="submit"
            className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {t('inventory.apply')}
          </button>
        </form>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label={t('reports.avg_food_cost')}
          value={
            <span style={{ color: priced.length ? avgBand.text : undefined }}>
              {avg.toFixed(1)}
            </span>
          }
          unit="%"
        />
        <MetricCard
          label={t('reports.highest')}
          value={
            <span className="font-sans text-lg">{highest?.name ?? '—'}</span>
          }
          sub={
            highest ? (
              <FoodCostBadge percent={highest.foodCostPercent} />
            ) : undefined
          }
        />
        <MetricCard
          label={t('reports.lowest')}
          value={
            <span className="font-sans text-lg">{lowest?.name ?? '—'}</span>
          }
          sub={
            lowest ? (
              <FoodCostBadge percent={lowest.foodCostPercent} />
            ) : undefined
          }
        />
      </div>

      {rows.length === 0 ? (
        <div className="stokly-card">
          <EmptyState message={t('recipes.empty')} />
        </div>
      ) : (
        <DataTable
          columns={[
            { label: t('recipes.name') },
            { label: t('recipes.total_cost'), align: 'right' },
            { label: t('recipes.sale_price'), align: 'right' },
            { label: t('recipes.food_cost'), align: 'right' },
            { label: t('recipes.margin'), align: 'right' },
          ]}
        >
          {rows.map((row) => {
            const margin =
              row.sale_price != null ? row.sale_price - row.totalCost : null
            return (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-right">
                  <MonoValue value={formatMoney(row.totalCost)} />
                </TableCell>
                <TableCell className="text-right">
                  {row.sale_price ? (
                    <MonoValue value={formatMoney(row.sale_price)} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {row.sale_price ? (
                    <FoodCostBadge percent={row.foodCostPercent} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {margin != null ? (
                    <MonoValue
                      value={formatMoney(margin)}
                      className={margin < 0 ? 'text-[#E53E3E]' : undefined}
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </DataTable>
      )}
    </div>
  )
}
