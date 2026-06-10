import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getIngredients,
  getSuppliers,
  getStorageLocations,
  getPurchaseLog,
  getIngredientPriceStats,
} from '@/lib/data/queries'
import type { IngredientOption, SupplierOption } from '@/types/app'
import { PageHeader } from '@/components/layout/page-header'
import { DeliveryForm } from '@/components/inventory/delivery-form'
import { PurchaseLogTable } from '@/components/inventory/purchase-log-table'
import { formatMoney } from '@/lib/utils'
import { Link } from '@/lib/i18n/navigation'
import { ListChecks } from 'lucide-react'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function PurchasesPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { from?: string; to?: string; prefill?: string }
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

  const [ingredients, suppliers, locations, log, priceStats] =
    await Promise.all([
      getIngredients(ctx.tenantId),
      getSuppliers(ctx.tenantId),
      getStorageLocations(ctx.tenantId),
      getPurchaseLog(ctx.tenantId, from, to),
      getIngredientPriceStats(ctx.tenantId),
    ])

  const ingredientOptions: IngredientOption[] = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    cost_per_unit: i.cost_per_unit,
    yield_percent: i.yield_percent,
    supplier_id: i.supplier_id,
  }))
  const supplierOptions: SupplierOption[] = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
  }))

  // Seed the entry form from a shopping-list prefill (?prefill=id:qty,…), keeping
  // only this tenant's ingredients.
  const validIds = new Set(ingredientOptions.map((i) => i.id))
  const initialLines = (searchParams.prefill ?? '')
    .split(',')
    .map((part) => {
      const [id, q] = part.split(':')
      return { ingredient_id: id, quantity: Number(q) }
    })
    .filter(
      (l) =>
        l.ingredient_id &&
        validIds.has(l.ingredient_id) &&
        Number.isFinite(l.quantity)
    )

  const totalSpend = log.reduce((sum, e) => sum + e.value, 0)

  return (
    <div>
      <PageHeader
        title={t('purchases.title')}
        description={t('purchases.subtitle')}
      />

      {/* Entry — what you bought today (adds to stock) */}
      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t('purchases.new_purchase')}
          </h2>
          <Link
            href="/app/purchases/shopping-list"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ListChecks className="h-3.5 w-3.5" />
            {t('shopping.view_list')}
          </Link>
        </div>
        {initialLines.length > 0 && (
          <p className="mb-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
            {t('shopping.prefilled_note')}
          </p>
        )}
        <DeliveryForm
          locale={locale}
          ingredients={ingredientOptions}
          suppliers={supplierOptions}
          initialLines={initialLines}
          priceStats={priceStats}
          locations={locations.map((l) => ({
            id: l.id,
            name: l.name,
            is_default_receiving: l.is_default_receiving,
          }))}
        />
      </section>

      {/* Browsable purchase history */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t('purchases.history')}
        </h2>

        <form className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
          <div className="space-y-1">
            <label htmlFor="from" className="text-xs font-medium text-muted-foreground">
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
            <label htmlFor="to" className="text-xs font-medium text-muted-foreground">
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

        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="stokly-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('purchases.total_value')}
            </p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
              {formatMoney(totalSpend)}
            </p>
          </div>
          <div className="stokly-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('purchases.count')}
            </p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
              {log.length}
            </p>
          </div>
        </div>

        <PurchaseLogTable entries={log} />
      </section>
    </div>
  )
}
