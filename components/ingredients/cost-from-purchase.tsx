'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { allowedUnitsFor, toBaseUnit } from '@/lib/constants/units'

// "I paid X for Y [unit]" → per-base-unit cost = X ÷ (Y converted to the base
// unit). Removes the manual division when an item is bought in packs/volumes
// that differ from the stock unit (e.g. a 0.75 L bottle for 20 ₼ → ₼/ml; a
// 0.6 kg fish for 9 ₼ → ₼/kg). `factors` are any conversions defined so far, so
// a custom pack unit (ədəd, şüşə) works too; metric pairs (l↔ml, kq↔q) need none.
export function CostFromPurchase({
  baseUnit,
  factors,
  onApply,
}: {
  baseUnit: string
  factors?: Record<string, number> | null
  onApply: (costPerBase: number) => void
}) {
  const t = useTranslations('ingredients')
  const [paid, setPaid] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('')

  if (!baseUnit) return null

  const units = allowedUnitsFor(baseUnit, factors)
  const effUnit = unit && units.includes(unit) ? unit : baseUnit
  const baseQty =
    Number(qty) > 0 ? toBaseUnit(Number(qty), effUnit, baseUnit, factors) : 0
  const perBase =
    Number(paid) > 0 && baseQty > 0
      ? Math.round((Number(paid) / baseQty) * 10000) / 10000
      : null

  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-border bg-secondary/20 p-3">
      <p className="text-xs font-medium">{t('cost_calc_title')}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={paid}
          onChange={(e) => setPaid(e.target.value)}
          placeholder="20"
          aria-label={t('cost_calc_paid')}
          className="h-9 w-24 text-right font-mono tabular-nums"
        />
        <span className="text-muted-foreground">₼ ·</span>
        <Input
          type="number"
          inputMode="decimal"
          step="0.001"
          min="0"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="0.75"
          aria-label={t('cost_calc_qty')}
          className="h-9 w-20 text-right font-mono tabular-nums"
        />
        <select
          value={effUnit}
          onChange={(e) => setUnit(e.target.value)}
          aria-label={t('unit')}
          className="h-9 rounded-md border border-input bg-card px-2 text-sm"
        >
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        {perBase != null && (
          <>
            <span className="font-mono text-xs font-semibold text-primary">
              = {perBase} ₼/{baseUnit}
            </span>
            <Button type="button" size="sm" onClick={() => onApply(perBase)}>
              {t('cost_calc_apply')}
            </Button>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t('cost_calc_help')}</p>
    </div>
  )
}
