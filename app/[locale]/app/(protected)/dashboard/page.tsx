import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ClipboardList, Truck, Trash2, Percent, Wallet, PackageX, Flame } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import { tenantHasFeature } from '@/lib/admin/entitlements'
import {
  getIngredients,
  getRecipes,
  getRecipeIngredients,
  getStockMovements,
  getRecentMovements,
  getActiveBatches,
  getTenant,
} from '@/lib/data/queries'
import {
  computeRecipesWithCost,
  averageFoodCostPercent,
} from '@/lib/calculations/recipe-cost'
import {
  deriveAllStockLevels,
  getExpiringBatches,
} from '@/lib/calculations/stock-level'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  MetricCard,
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
import { getLastCountInfo } from '@/lib/data/counts'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export default async function DashboardPage({
  params: { locale },
}: {
  params: { locale: string }
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
  const [recipeIngredients, movements, recent, batches] = await Promise.all([
    getRecipeIngredients(ctx.tenantId),
    getStockMovements(ctx.tenantId),
    getRecentMovements(ctx.tenantId, 8),
    getActiveBatches(ctx.tenantId),
  ])

  const recipesWithCost = computeRecipesWithCost(
    ingredients,
    recipes,
    recipeIngredients
  )
  const avgFoodCost = averageFoodCostPercent(recipesWithCost)
  const pricedRecipeCount = recipesWithCost.filter(
    (r) => !r.is_sub_recipe && r.sale_price && r.sale_price > 0
  ).length

  const stockLevels = deriveAllStockLevels(movements)
  const ingredientById = new Map(ingredients.map((i) => [i.id, i]))

  // Inventory value = Σ current stock × cost per unit.
  const inventoryValue = ingredients.reduce(
    (sum, i) => sum + (stockLevels.get(i.id) ?? 0) * i.cost_per_unit,
    0
  )

  // Low-stock count across all thresholds.
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

  // Waste value this week = Σ |waste qty| × cost, last 7 days.
  const weekAgo = Date.now() - WEEK_MS
  const wasteThisWeek = movements
    .filter(
      (m) =>
        m.movement_type === 'waste' &&
        new Date(m.created_at).getTime() >= weekAgo
    )
    .reduce((sum, m) => {
      const ing = ingredientById.get(m.ingredient_id)
      const cost = m.unit_cost ?? ing?.cost_per_unit ?? 0
      return sum + Math.abs(m.quantity) * cost
    }, 0)

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

  const band = foodCostBand(avgFoodCost)

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

      {/* Metric row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('dashboard.avg_food_cost')}
          value={
            <span style={{ color: pricedRecipeCount ? band.text : undefined }}>
              {avgFoodCost.toFixed(1)}
            </span>
          }
          unit="%"
          icon={<Percent className="h-4 w-4" />}
          sub={
            <span className="text-muted-foreground">
              {t('dashboard.across_recipes', { count: pricedRecipeCount })}
            </span>
          }
        />
        <MetricCard
          label={t('dashboard.inventory_value')}
          value={inventoryValue.toFixed(2)}
          unit="AZN"
          icon={<Wallet className="h-4 w-4" />}
        />
        <MetricCard
          label={t('dashboard.low_stock_count')}
          value={lowStockAll.length}
          icon={<PackageX className="h-4 w-4" />}
          sub={
            <span
              className={
                lowStockAll.length > 0 ? 'text-[#D97706]' : 'text-muted-foreground'
              }
            >
              {t('dashboard.items_below', { count: lowStockAll.length })}
            </span>
          }
        />
        <MetricCard
          label={t('dashboard.waste_week')}
          value={wasteThisWeek.toFixed(2)}
          unit="AZN"
          icon={<Flame className="h-4 w-4" />}
        />
      </div>

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
