'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import {
  StoklyCard,
  MonoValue,
  FoodCostBadge,
} from '@/components/ui/stokly-theme'
import {
  foodCostPercent,
  suggestedPrice,
  costPerServing,
} from '@/lib/calculations/food-cost'

// Live cost panel. All inputs are computed by the parent on every keystroke,
// so this re-renders instantly with no server round-trip. The food-cost badge
// animates its colour as the percentage crosses band thresholds.
export function RecipeCostSummary({
  totalCost,
  servingSize,
  salePrice,
  onSalePriceChange,
  disabled,
}: {
  totalCost: number
  servingSize: number | null
  salePrice: string
  onSalePriceChange: (value: string) => void
  disabled?: boolean
}) {
  const t = useTranslations('recipes')

  // sale_price is per SERVING (the menu price), so the live food-cost % and the
  // suggested price compare against the per-serving cost, not the whole batch —
  // mirroring computeRecipesWithCost and the menu-engineering report.
  const perServing = costPerServing(totalCost, servingSize)
  const parsedSale = salePrice === '' ? null : Number(salePrice)
  const percent =
    parsedSale && parsedSale > 0 ? foodCostPercent(perServing, parsedSale) : 0
  const suggested = suggestedPrice(perServing, 30)

  return (
    <StoklyCard className="lg:sticky lg:top-2">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold">{t('food_cost')}</h2>
      </div>

      <div className="space-y-3 px-5 py-4">
        <Row label={t('total_cost')}>
          <MonoValue value={totalCost.toFixed(2)} unit="AZN" />
        </Row>
        <Row label={t('cost_per_serving')}>
          <MonoValue value={perServing.toFixed(2)} unit="AZN" />
        </Row>
        <Row label={t('sale_price')}>
          <div className="relative w-32">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={salePrice}
              disabled={disabled}
              onChange={(e) => onSalePriceChange(e.target.value)}
              className="h-9 pr-12 text-right font-mono tabular-nums"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              AZN
            </span>
          </div>
        </Row>

        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('food_cost')}
            </span>
            {parsedSale && parsedSale > 0 ? (
              <FoodCostBadge percent={percent} size="lg" />
            ) : (
              <span className="font-mono text-2xl text-muted-foreground">
                —
              </span>
            )}
          </div>
        </div>

        <Row label={t('suggested_price')} emphasise>
          <MonoValue
            value={suggested.toFixed(2)}
            unit="AZN"
            className="text-lg font-medium text-foreground"
          />
        </Row>
      </div>
    </StoklyCard>
  )
}

function Row({
  label,
  children,
  emphasise,
}: {
  label: string
  children: React.ReactNode
  emphasise?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={
          emphasise
            ? 'text-sm font-medium text-foreground'
            : 'text-sm text-muted-foreground'
        }
      >
        {label}
      </span>
      {children}
    </div>
  )
}
