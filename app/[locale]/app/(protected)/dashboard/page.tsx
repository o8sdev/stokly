import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  ClipboardList,
  Truck,
  Trash2,
  Percent,
  Wallet,
  Receipt,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/utils'
import { requireTenant } from '@/lib/auth/tenant'
import { tenantHasFeature } from '@/lib/admin/entitlements'
import {
  getIngredients,
  getRecipes,
  getStockMovements,
  getRecentMovements,
  getActiveBatches,
  getTenant,
} from '@/lib/data/queries'
import {
  getOverview,
  resolveRange,
  RANGE_PRESETS,
  type RangePreset,
} from '@/lib/data/overview'
import {
  deriveAllStockLevels,
  getExpiringBatches,
} from '@/lib/calculations/stock-level'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  MetricCard,
  StoklyCard,
  EmptyState,
  foodCostBand,
} from '@/components/ui/stokly-theme'
import {
  LowStockWidget,
  type LowStockRow,
} from '@/components/dashboard/low-stock-widget'
import {
  RecentMovementsWidget,
  type MovementRow,
} from '@/components/dashboard/recent-movements-widget'
import {
  ExpiryWidget,
  type ExpiryRow,
} from '@/components/dashboard/expiry-widget'
import { GettingStarted } from '@/components/dashboard/getting-started'
import { CountReminder } from '@/components/dashboard/count-reminder'
import { RangeSelector } from '@/components/dashboard/range-selector'
import { SalesTrendChart } from '@/components/dashboard/sales-trend-chart'
import { getLastCountInfo } from '@/lib/data/counts'

const fmtMoney = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// % change vs the previous period; null when there's no baseline to compare to.
const pctChange = (cur: number, prev: number): number | null =>
  prev === 0 ? null : ((cur - prev) / Math.abs(prev)) * 100

export default async function DashboardPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { range?: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  // First-run welcome card, shown ABOVE the dashboard (never replacing it),
  // until the core setup (a recipe + an initial count) is done or the card is
  // explicitly dismissed. Gated by the onboarding_screen feature flag.
  const [tenant, ingredients, recipes, lastCount] = await Promise.all([
    getTenant(ctx.tenantId),
    getIngredients(ctx.tenantId),
    getRecipes(ctx.tenantId),
    getLastCountInfo(ctx.tenantId),
  ])
  const needsOnboarding =
    !tenant?.onboarding_dismissed_at &&
    (recipes.length === 0 || lastCount.lastCountDate === null)
  const showGettingStarted =
    needsOnboarding && (await tenantHasFeature(ctx.tenantId, 'onboarding_screen'))

  // Dashboard widget data.
  const [movements, recent, batches] = await Promise.all([
    getStockMovements(ctx.tenantId),
    getRecentMovements(ctx.tenantId, 8),
    getActiveBatches(ctx.tenantId),
  ])

  // Owner's overview — period-scoped KPIs over the selected range (default: this
  // month), with the previous equal-length window for deltas. Reuses the
  // already-loaded movements + ingredients (no second movements fetch).
  const preset: RangePreset = RANGE_PRESETS.includes(
    searchParams.range as RangePreset
  )
    ? (searchParams.range as RangePreset)
    : 'this_month'
  const range = resolveRange(preset)
  const overview = await getOverview(ctx.tenantId, range, {
    movements,
    ingredients,
  })
  const cur = overview.current
  const prev = overview.previous

  const stockLevels = deriveAllStockLevels(movements)
  const ingredientById = new Map(ingredients.map((i) => [i.id, i]))

  // Low-stock list for the operational widget.
  const lowStockAll = ingredients
    .filter((i) => i.low_stock_threshold != null)
    .map((i) => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
      currentStock: stockLevels.get(i.id) ?? 0,
      threshold: i.low_stock_threshold as number,
    }))
    .filter((r) => r.currentStock <= r.threshold)

  const lowStock: LowStockRow[] = lowStockAll.slice(0, 6)

  const recentRows: MovementRow[] = recent.map((m) => {
    const ing = ingredientById.get(m.ingredient_id)
    return {
      id: m.id,
      type: m.movement_type,
      ingredientName: ing?.name ?? '—',
      quantity: m.quantity,
      unit: ing?.unit ?? '',
      isAbsolute: m.is_absolute,
      createdAt: m.created_at,
      user: m.recorded_by === ctx.userId ? ctx.email ?? '—' : '—',
    }
  })

  // Batches expiring within 7 days, annotated with ingredient names.
  const expiryRows: ExpiryRow[] = getExpiringBatches(batches, 7).map((b) => ({
    id: b.id,
    ingredientName: ingredientById.get(b.ingredient_id)?.name ?? '—',
    quantityRemaining: b.quantity_remaining,
    unit: b.unit,
    expiryDate: b.expiry_date as string,
    daysRemaining: b.days_remaining,
  }))

  // ── Delta sub-lines for the KPI cards ──────────────────────────────────
  const vsPrev = t('overview.vs_prev')

  // Money/volume delta: green when the change is in the desired direction.
  const deltaPct = (c: number, p: number, goodWhenUp: boolean) => {
    const pct = pctChange(c, p)
    if (pct === null || !Number.isFinite(pct)) {
      return <span className="text-muted-foreground">{vsPrev}</span>
    }
    const up = pct >= 0
    const good = up === goodWhenUp
    const Icon = up ? TrendingUp : TrendingDown
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1',
          good ? 'text-emerald-600' : 'text-red-600'
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {Math.abs(pct).toFixed(0)}%
        <span className="text-muted-foreground">{vsPrev}</span>
      </span>
    )
  }

  // Neutral delta (purchases) — direction shown, but never coloured good/bad.
  const deltaNeutral = (c: number, p: number) => {
    const pct = pctChange(c, p)
    if (pct === null || !Number.isFinite(pct)) {
      return <span className="text-muted-foreground">{vsPrev}</span>
    }
    const up = pct >= 0
    const Icon = up ? TrendingUp : TrendingDown
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {Math.abs(pct).toFixed(0)}% {vsPrev}
      </span>
    )
  }

  // Food-cost % delta in percentage points — lower is better.
  const deltaPoints = (c: number | null, p: number | null) => {
    if (c === null || p === null) {
      return <span className="text-muted-foreground">{vsPrev}</span>
    }
    const d = c - p
    if (Math.abs(d) < 0.05) {
      return <span className="text-muted-foreground">{vsPrev}</span>
    }
    const up = d > 0
    const Icon = up ? TrendingUp : TrendingDown
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1',
          up ? 'text-red-600' : 'text-emerald-600'
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {Math.abs(d).toFixed(1)} {t('overview.pts')}
      </span>
    )
  }

  return (
    <div>
      {showGettingStarted && (
        <div className="mb-6">
          <GettingStarted locale={locale} />
        </div>
      )}

      <PageHeader
        title={t('dashboard.title')}
        action={
          <div className="hidden flex-wrap gap-2 sm:flex">
            <Button asChild variant="secondary" size="sm" className="gap-2">
              <Link href="/app/inventory/count">
                <ClipboardList className="h-4 w-4" />
                {t('inventory.count')}
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm" className="gap-2">
              <Link href="/app/purchases">
                <Truck className="h-4 w-4" />
                {t('purchases.title')}
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm" className="gap-2">
              <Link href="/app/inventory/waste">
                <Trash2 className="h-4 w-4" />
                {t('inventory.waste')}
              </Link>
            </Button>
          </div>
        }
      />

      <CountReminder info={lastCount} />

      {/* Period selector — drives the whole overview. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {range.from} — {range.to}
        </p>
        <RangeSelector />
      </div>

      {/* Owner KPI band — period-scoped, with deltas vs the previous period. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label={t('overview.revenue')}
          value={fmtMoney(cur.revenue)}
          unit="AZN"
          icon={<Receipt className="h-4 w-4" />}
          sub={deltaPct(cur.revenue, prev.revenue, true)}
        />
        <MetricCard
          label={t('overview.food_cost')}
          value={
            <span
              style={{
                color:
                  cur.foodCostPercent != null
                    ? foodCostBand(cur.foodCostPercent).text
                    : undefined,
              }}
            >
              {cur.foodCostPercent != null
                ? cur.foodCostPercent.toFixed(1)
                : '—'}
            </span>
          }
          unit={cur.foodCostPercent != null ? '%' : undefined}
          icon={<Percent className="h-4 w-4" />}
          sub={deltaPoints(cur.foodCostPercent, prev.foodCostPercent)}
        />
        <MetricCard
          label={t('overview.gross_profit')}
          value={fmtMoney(cur.grossProfit)}
          unit="AZN"
          icon={<TrendingUp className="h-4 w-4" />}
          sub={deltaPct(cur.grossProfit, prev.grossProfit, true)}
        />
        <MetricCard
          label={t('overview.purchases')}
          value={fmtMoney(cur.purchases)}
          unit="AZN"
          icon={<ShoppingCart className="h-4 w-4" />}
          sub={deltaNeutral(cur.purchases, prev.purchases)}
        />
        <MetricCard
          label={t('overview.waste')}
          value={fmtMoney(cur.wasteValue)}
          unit="AZN"
          icon={<Trash2 className="h-4 w-4" />}
          sub={deltaPct(cur.wasteValue, prev.wasteValue, false)}
        />
        <MetricCard
          label={t('overview.inventory_value')}
          value={fmtMoney(cur.inventoryValue)}
          unit="AZN"
          icon={<Wallet className="h-4 w-4" />}
          sub={
            <span className="text-muted-foreground">
              {t('overview.as_of', { date: range.to })}
            </span>
          }
        />
      </div>

      {/* Daily sales trend across the selected range. */}
      <StoklyCard className="mt-4 px-6 py-5">
        <h2 className="text-sm font-semibold">{t('overview.daily_sales')}</h2>
        <div className="mt-4">
          {cur.revenue > 0 ? (
            <SalesTrendChart data={overview.dailySales} />
          ) : (
            <EmptyState message={t('overview.no_sales')} />
          )}
        </div>
      </StoklyCard>

      {/* Two-column: movements (2) + right stack (low stock + expiry) */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentMovementsWidget rows={recentRows} locale={locale} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-1">
          <LowStockWidget rows={lowStock} />
          <ExpiryWidget rows={expiryRows} />
        </div>
      </div>
    </div>
  )
}
