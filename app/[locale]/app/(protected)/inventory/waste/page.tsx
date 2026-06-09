import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getIngredients,
  getWasteCategories,
  getStockMovements,
  getWasteLog,
} from '@/lib/data/queries'
import { deriveAllStockLevels } from '@/lib/calculations/stock-level'
import type { IngredientOption } from '@/types/app'
import { PageHeader } from '@/components/layout/page-header'
import { WasteForm } from '@/components/inventory/waste-form'
import { WasteLogTable } from '@/components/inventory/waste-log-table'
import { Link } from '@/lib/i18n/navigation'
import { formatMoney } from '@/lib/utils'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function WastePage({
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

  const [ingredients, categories, movements, log] = await Promise.all([
    getIngredients(ctx.tenantId),
    getWasteCategories(ctx.tenantId),
    getStockMovements(ctx.tenantId),
    getWasteLog(ctx.tenantId, from, to),
  ])

  const ingredientOptions: IngredientOption[] = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    cost_per_unit: i.cost_per_unit,
    yield_percent: i.yield_percent,
    supplier_id: i.supplier_id,
  }))

  const stockLevels: Record<string, number> = Object.fromEntries(
    deriveAllStockLevels(movements)
  )

  const active = log.filter((e) => !e.reversed)
  const totalValue = active.reduce((sum, e) => sum + e.value, 0)

  return (
    <div>
      <PageHeader title={t('inventory.waste_log')} />
      <Link
        href="/app/inventory"
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        ← {t('inventory.current_stock')}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[24rem_1fr]">
        {/* Entry form */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t('inventory.log_waste')}
          </h2>
          <WasteForm
            locale={locale}
            defaultDate={today}
            ingredients={ingredientOptions}
            categories={categories}
            stockLevels={stockLevels}
          />
        </div>

        {/* Browsable log */}
        <div className="space-y-4">
          {/* Period filter */}
          <form className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
            <div className="space-y-1">
              <label
                htmlFor="from"
                className="text-xs font-medium text-muted-foreground"
              >
                {t('inventory.from')}
              </label>
              <input
                id="from"
                name="from"
                type="date"
                defaultValue={from}
                className="flex h-9 rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="to"
                className="text-xs font-medium text-muted-foreground"
              >
                {t('inventory.to')}
              </label>
              <input
                id="to"
                name="to"
                type="date"
                defaultValue={to}
                className="flex h-9 rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
              />
            </div>
            <button
              type="submit"
              className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {t('inventory.apply')}
            </button>
          </form>

          {/* Period summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="stokly-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('inventory.total_waste_value')}
              </p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#E53E3E]">
                {formatMoney(totalValue)}
              </p>
            </div>
            <div className="stokly-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('inventory.waste_entries')}
              </p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
                {active.length}
              </p>
            </div>
          </div>

          <WasteLogTable locale={locale} entries={log} />
        </div>
      </div>
    </div>
  )
}
