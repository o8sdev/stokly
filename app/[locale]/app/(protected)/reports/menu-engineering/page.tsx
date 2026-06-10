import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getIngredients,
  getRecipes,
  getRecipeIngredients,
  getSalesMix,
} from '@/lib/data/queries'
import { computeRecipesWithCost } from '@/lib/calculations/recipe-cost'
import {
  computeMenuEngineering,
  type MenuClass,
} from '@/lib/calculations/menu-engineering'
import { PageHeader } from '@/components/layout/page-header'
import { MetricCard, EmptyState } from '@/components/ui/stokly-theme'
import { formatMoney, formatPercent } from '@/lib/utils'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const CLASSES: MenuClass[] = ['star', 'plowhorse', 'puzzle', 'dog']
const BADGE: Record<MenuClass, string> = {
  star: 'bg-[#D1FAE5] text-[#065F46]',
  plowhorse: 'bg-[#DBEAFE] text-[#1E40AF]',
  puzzle: 'bg-[#FEF3C7] text-[#92400E]',
  dog: 'bg-[#FEE2E2] text-[#991B1B]',
}

export default async function MenuEngineeringPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { from?: string; to?: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = `${today.slice(0, 7)}-01`
  const from = DATE_RE.test(searchParams.from ?? '')
    ? (searchParams.from as string)
    : firstOfMonth
  const to = DATE_RE.test(searchParams.to ?? '')
    ? (searchParams.to as string)
    : today

  const [ingredients, recipes, recipeIngredients, mix] = await Promise.all([
    getIngredients(ctx.tenantId),
    getRecipes(ctx.tenantId),
    getRecipeIngredients(ctx.tenantId),
    getSalesMix(ctx.tenantId, from, to),
  ])

  const withCost = computeRecipesWithCost(ingredients, recipes, recipeIngredients)
  const inputs = withCost
    .filter((r) => !r.is_sub_recipe && r.sale_price != null && r.sale_price > 0)
    .map((r) => ({
      recipe_id: r.id,
      name: r.name,
      units_sold: mix.get(r.id) ?? 0,
      sale_price: r.sale_price as number,
      plate_cost: r.costPerServing,
    }))
  const me = computeMenuEngineering(inputs)

  const inputCls =
    'flex h-9 rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15'

  return (
    <div>
      <PageHeader
        title={t('reports.menu_engineering')}
        description={t('menu_eng.subtitle')}
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

      {inputs.length === 0 ? (
        <div className="stokly-card">
          <EmptyState message={t('menu_eng.empty')} />
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CLASSES.map((c) => (
              <MetricCard key={c} label={t(`menu_eng.${c}`)} value={me.counts[c]} />
            ))}
          </div>

          {me.total_units === 0 && (
            <p className="mb-4 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs text-[#92400E]">
              {t('menu_eng.no_sales')}
            </p>
          )}

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">{t('menu_eng.col_item')}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t('menu_eng.col_sold')}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t('menu_eng.col_popularity')}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t('menu_eng.col_plate_cost')}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t('menu_eng.col_price')}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t('menu_eng.col_margin')}</th>
                  <th className="px-4 py-3 font-semibold">{t('menu_eng.col_class')}</th>
                </tr>
              </thead>
              <tbody>
                {me.items.map((i) => (
                  <tr key={i.recipe_id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5 font-medium">{i.name}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                      {i.units_sold}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                      {formatPercent(i.popularity * 100)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                      {formatMoney(i.plate_cost)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {formatMoney(i.sale_price)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold">
                      {formatMoney(i.margin)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BADGE[i.klass]}`}
                      >
                        {t(`menu_eng.${i.klass}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend: what each class means + the recommended action */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CLASSES.map((c) => (
              <div key={c} className="rounded-lg border border-border bg-card p-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BADGE[c]}`}
                >
                  {t(`menu_eng.${c}`)}
                </span>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t(`menu_eng.action_${c}`)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
