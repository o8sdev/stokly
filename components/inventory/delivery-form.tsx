'use client'

import { useMemo, useState } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { submitDelivery } from '@/app/[locale]/app/(protected)/inventory/actions'
import type { InventoryActionResult } from '@/app/[locale]/app/(protected)/inventory/actions'
import type { IngredientOption, SupplierOption } from '@/types/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '@/components/ui/submit-button'
import { formatMoney, cn } from '@/lib/utils'
import {
  priceVariance,
  isPriceOutlier,
  type PriceStat,
} from '@/lib/calculations/price-variance'

interface LocationOption {
  id: string
  name: string
  is_default_receiving: boolean
}

interface Line {
  key: string
  ingredient_id: string
  quantity: string
  unit_cost: string
  expiry_date: string
  supplier_lot: string
  supplier_id: string
}

let counter = 0
const newKey = () => `d-${(counter += 1)}`
const blankLine = (): Line => ({
  key: newKey(),
  ingredient_id: '',
  quantity: '',
  unit_cost: '',
  expiry_date: '',
  supplier_lot: '',
  supplier_id: '',
})

export function DeliveryForm({
  locale,
  ingredients,
  suppliers,
  locations,
  initialLines,
  priceStats,
}: {
  locale: string
  ingredients: IngredientOption[]
  suppliers: SupplierOption[]
  locations: LocationOption[]
  initialLines?: { ingredient_id: string; quantity: number }[]
  priceStats?: Record<string, PriceStat>
}) {
  const t = useTranslations()
  const defaultLocation =
    locations.find((l) => l.is_default_receiving)?.id ?? locations[0]?.id ?? ''
  const [locationId, setLocationId] = useState(defaultLocation)
  const [notes, setNotes] = useState('')
  // Seed from a shopping-list prefill (?prefill=id:qty,…) when provided,
  // defaulting unit cost + supplier from each ingredient (as selectIngredient
  // would); otherwise a single blank line.
  const [lines, setLines] = useState<Line[]>(() => {
    const seeded = (initialLines ?? []).filter((l) => l.ingredient_id)
    if (seeded.length === 0) return [blankLine()]
    return seeded.map((l) => {
      const opt = ingredients.find((i) => i.id === l.ingredient_id)
      return {
        key: newKey(),
        ingredient_id: l.ingredient_id,
        quantity: l.quantity > 0 ? String(l.quantity) : '',
        unit_cost: opt ? String(opt.cost_per_unit) : '',
        expiry_date: '',
        supplier_lot: '',
        supplier_id: opt?.supplier_id ?? '',
      }
    })
  })

  const action = submitDelivery.bind(null, locale)
  const [state, formAction] = useFormState<InventoryActionResult, FormData>(
    action,
    {}
  )

  function patch(key: string, p: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)))
  }

  function addLine() {
    setLines((prev) => [...prev, blankLine()])
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  // Selecting an ingredient defaults the unit cost AND the supplier to that
  // ingredient's own values (still editable per line).
  function selectIngredient(key: string, id: string) {
    const opt = ingredients.find((i) => i.id === id)
    patch(key, {
      ingredient_id: id,
      unit_cost: opt ? String(opt.cost_per_unit) : '',
      supplier_id: opt?.supplier_id ?? '',
    })
  }

  const total = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const q = Number(l.quantity)
        const c = Number(l.unit_cost)
        return sum + (Number.isFinite(q) && Number.isFinite(c) ? q * c : 0)
      }, 0),
    [lines]
  )

  const payload = useMemo(
    () =>
      JSON.stringify({
        location_id: locationId,
        notes,
        lines: lines
          .filter((l) => l.ingredient_id && l.quantity !== '')
          .map((l) => ({
            ingredient_id: l.ingredient_id,
            quantity: Number(l.quantity),
            unit_cost: l.unit_cost === '' ? 0 : Number(l.unit_cost),
            expiry_date: l.expiry_date,
            supplier_lot: l.supplier_lot,
            supplier_id: l.supplier_id,
          })),
      }),
    [locationId, notes, lines]
  )

  const selectCls =
    'flex h-9 w-full rounded-md border border-input bg-card px-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15'

  return (
    <form action={formAction} className="max-w-3xl space-y-5">
      <input type="hidden" name="payload" value={payload} />

      {locations.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="location">{t('inventory.received_into')}</Label>
          <select
            id="location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className={selectCls.replace('h-9', 'h-[38px]')}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {t('inventory.received_into_hint')}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {lines.map((line) => {
          const stat = priceStats?.[line.ingredient_id]
          const typedCost = Number(line.unit_cost)
          const variance = priceVariance(typedCost, stat?.avg_cost ?? null)
          const outlier =
            line.unit_cost !== '' &&
            isPriceOutlier(typedCost, stat?.avg_cost ?? null)
          return (
          <div
            key={line.key}
            className="space-y-2 rounded-lg border border-border p-3"
          >
            <div className="grid grid-cols-2 items-end gap-2 md:grid-cols-[1fr_104px_104px_150px_40px]">
              <div className="col-span-2 space-y-1 md:col-span-1">
                <Label className="text-xs">
                  {t('inventory.delivery')} — {t('recipes.line_ingredient')}
                </Label>
                <select
                  value={line.ingredient_id}
                  onChange={(e) => selectIngredient(line.key, e.target.value)}
                  className={selectCls}
                >
                  <option value="">{t('recipes.select_ingredient')}</option>
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {t('inventory.delivery_quantity')}
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0"
                  value={line.quantity}
                  onChange={(e) => patch(line.key, { quantity: e.target.value })}
                  className="text-right font-mono tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {t('inventory.delivery_unit_cost')}
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.0001"
                  min="0"
                  value={line.unit_cost}
                  onChange={(e) =>
                    patch(line.key, { unit_cost: e.target.value })
                  }
                  className="text-right font-mono tabular-nums"
                />
              </div>
              <div className="col-span-2 space-y-1 md:col-span-1">
                <Label className="text-xs">{t('inventory.expiry_date')}</Label>
                <Input
                  type="date"
                  value={line.expiry_date}
                  onChange={(e) =>
                    patch(line.key, { expiry_date: e.target.value })
                  }
                  className="font-mono"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeLine(line.key)}
                aria-label="Delete line"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            {stat && line.ingredient_id && (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-muted-foreground">
                  {t('price_history.last_label')}{' '}
                  <span className="font-mono tabular-nums">
                    {stat.last_cost != null ? formatMoney(stat.last_cost) : '—'}
                  </span>
                  {' · '}
                  {t('price_history.avg_label')}{' '}
                  <span className="font-mono tabular-nums">
                    {stat.avg_cost != null ? formatMoney(stat.avg_cost) : '—'}
                  </span>
                </span>
                {outlier && variance != null && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold',
                      variance > 0
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : 'bg-[#D1FAE5] text-[#065F46]'
                    )}
                  >
                    {variance > 0 ? '↑' : '↓'}{' '}
                    {Math.abs(variance * 100).toFixed(0)}%{' '}
                    {variance > 0
                      ? t('price_history.above_avg')
                      : t('price_history.below_avg')}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">
                  {t('inventory.delivery_supplier')}
                </Label>
                <select
                  value={line.supplier_id}
                  onChange={(e) =>
                    patch(line.key, { supplier_id: e.target.value })
                  }
                  className={selectCls}
                >
                  <option value="">{t('ingredients.no_supplier')}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('inventory.supplier_lot')}</Label>
                <Input
                  value={line.supplier_lot}
                  onChange={(e) =>
                    patch(line.key, { supplier_lot: e.target.value })
                  }
                  placeholder={t('inventory.supplier_lot_ph')}
                  className="h-9"
                />
              </div>
            </div>
          </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLine}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {t('inventory.add_line')}
        </Button>
        <span className="text-sm font-medium">
          {t('recipes.total_cost')}:{' '}
          <span className="font-mono tabular-nums">{formatMoney(total)}</span>
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t('inventory.notes')}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{t('common.error')}</p>
      )}

      <div className="flex gap-2">
        <SubmitButton pendingText={t('common.saving')}>
          {t('common.save')}
        </SubmitButton>
        <Button asChild variant="outline" type="button">
          <Link href="/app/purchases">{t('common.cancel')}</Link>
        </Button>
      </div>
    </form>
  )
}
