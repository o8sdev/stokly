import { getTranslations } from 'next-intl/server'
import {
  Percent,
  Wallet,
  Receipt,
  ShoppingCart,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getIngredients,
  getStockMovements,
  getRecentMovements,
  getActiveBatches,
} from '@/lib/data/queries'
import { resolveMemberEmails } from '@/lib/data/activity'
import {
  getOverview,
  getOverviewPanels,
  type ResolvedRange,
} from '@/lib/data/overview'
import {
  deriveAllStockLevels,
  getExpiringBatches,
} from '@/lib/calculations/stock-level'
import {
  MetricCard,
  StoklyCard,
  EmptyState,
  foodCostBand,
} from '@/components/ui/stokly-theme'
import { AnimatedNumber } from '@/components/dashboard/animated-number'
import { SalesTrendChart } from '@/components/dashboard/sales-trend-chart'
import {
  OverviewPanels,
  AttentionStrip,
} from '@/components/dashboard/overview-panels'
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

/* The dashboard is streamed: the shell (greeting, quick actions, range) paints
   immediately and these async sections fill in as their data lands. The hot
   read helpers are request-cached, so sections share fetches instead of
   re-querying. */

const pctChange = (cur: number, prev: number): number | null =>
  prev === 0 ? null : ((cur - prev) / Math.abs(prev)) * 100

// ── KPI band + daily sales trend ──────────────────────────────────────────
export async function OverviewSection({
  tenantId,
  range,
}: {
  tenantId: string
  range: ResolvedRange
}) {
  const t = await getTranslations()
  const [movements, ingredients] = await Promise.all([
    getStockMovements(tenantId),
    getIngredients(tenantId),
  ])
  const overview = await getOverview(tenantId, range, { movements, ingredients })
  const cur = overview.current
  const prev = overview.previous
  const vsPrev = t('overview.vs_prev')

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
  const deltaNeutral = (c: number, p: number) => {
    const pct = pctChange(c, p)
    if (pct === null || !Number.isFinite(pct)) {
      return <span className="text-muted-foreground">{vsPrev}</span>
    }
    const Icon = pct >= 0 ? TrendingUp : TrendingDown
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {Math.abs(pct).toFixed(0)}% {vsPrev}
      </span>
    )
  }
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
    <>
      <div className="card-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 [&>*]:transition-all [&>*]:duration-300 [&>*:hover]:-translate-y-0.5 [&>*:hover]:shadow-md">
        <MetricCard
          label={t('overview.revenue')}
          value={<AnimatedNumber to={cur.revenue} />}
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
          value={<AnimatedNumber to={cur.grossProfit} />}
          unit="AZN"
          icon={<TrendingUp className="h-4 w-4" />}
          sub={deltaPct(cur.grossProfit, prev.grossProfit, true)}
        />
        <MetricCard
          label={t('overview.purchases')}
          value={<AnimatedNumber to={cur.purchases} />}
          unit="AZN"
          icon={<ShoppingCart className="h-4 w-4" />}
          sub={deltaNeutral(cur.purchases, prev.purchases)}
        />
        <MetricCard
          label={t('overview.waste')}
          value={<AnimatedNumber to={cur.wasteValue} />}
          unit="AZN"
          icon={<Trash2 className="h-4 w-4" />}
          sub={deltaPct(cur.wasteValue, prev.wasteValue, false)}
        />
        <MetricCard
          label={t('overview.inventory_value')}
          value={<AnimatedNumber to={cur.inventoryValue} />}
          unit="AZN"
          icon={<Wallet className="h-4 w-4" />}
          sub={
            <span className="text-muted-foreground">
              {t('overview.as_of', { date: range.to })}
            </span>
          }
        />
      </div>

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
    </>
  )
}

// ── Attention strip + top-lists ───────────────────────────────────────────
export async function PanelsSection({
  tenantId,
  range,
}: {
  tenantId: string
  range: ResolvedRange
}) {
  const [movements, ingredients, batches, panels] = await Promise.all([
    getStockMovements(tenantId),
    getIngredients(tenantId),
    getActiveBatches(tenantId),
    getOverviewPanels(tenantId, range.from, range.to),
  ])
  const levels = deriveAllStockLevels(movements)
  const lowStockCount = ingredients.filter(
    (i) =>
      i.low_stock_threshold != null &&
      (levels.get(i.id) ?? 0) <= i.low_stock_threshold
  ).length
  const expiringCount = getExpiringBatches(batches, 7).length
  const oversoldCount = [...levels.values()].filter((v) => v < -1e-9).length

  return (
    <>
      {/* Alerts first — the "what needs me today" scan, right under the trend. */}
      <div className="mt-4">
        <AttentionStrip
          lowStock={lowStockCount}
          expiring={expiringCount}
          oversold={oversoldCount}
          missingSales={panels.missingSalesDays}
        />
      </div>
      <div className="card-stagger mt-4">
        <OverviewPanels data={panels} />
      </div>
    </>
  )
}

// ── Operational widgets (movements · low stock · expiry) ─────────────────
export async function OpsSection({
  tenantId,
  locale,
  userId,
  email,
}: {
  tenantId: string
  locale: string
  userId: string
  email: string | null
}) {
  const [movements, ingredients, recent, batches] = await Promise.all([
    getStockMovements(tenantId),
    getIngredients(tenantId),
    getRecentMovements(tenantId, 8),
    getActiveBatches(tenantId),
  ])
  const levels = deriveAllStockLevels(movements)
  const ingredientById = new Map(ingredients.map((i) => [i.id, i]))

  const lowStock: LowStockRow[] = ingredients
    .filter((i) => i.low_stock_threshold != null)
    .map((i) => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
      currentStock: levels.get(i.id) ?? 0,
      threshold: i.low_stock_threshold as number,
    }))
    .filter((r) => r.currentStock <= r.threshold)
    .slice(0, 6)

  // Resolve every actor (not just the current user) so the feed shows who did
  // what — accountability, and the read-side of the audit trail.
  const actorEmails = await resolveMemberEmails(recent.map((m) => m.recorded_by))
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
      user:
        (m.recorded_by ? actorEmails.get(m.recorded_by) : null) ??
        (m.recorded_by === userId ? email : null) ??
        '—',
    }
  })

  const expiryRows: ExpiryRow[] = getExpiringBatches(batches, 7).map((b) => ({
    id: b.id,
    ingredientName: ingredientById.get(b.ingredient_id)?.name ?? '—',
    quantityRemaining: b.quantity_remaining,
    unit: b.unit,
    expiryDate: b.expiry_date as string,
    daysRemaining: b.days_remaining,
  }))

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <RecentMovementsWidget rows={recentRows} locale={locale} />
      </div>
      <div className="flex flex-col gap-4 lg:col-span-1">
        <LowStockWidget rows={lowStock} />
        <ExpiryWidget rows={expiryRows} />
      </div>
    </div>
  )
}
