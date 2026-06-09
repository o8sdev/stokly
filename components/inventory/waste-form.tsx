'use client'

import { useMemo, useState } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import {
  AlertTriangle,
  ArrowDownToLine,
  CalendarX,
  ChefHat,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { submitWaste } from '@/app/[locale]/app/(protected)/inventory/actions'
import type { InventoryActionResult } from '@/app/[locale]/app/(protected)/inventory/actions'
import type { IngredientOption } from '@/types/app'
import type { WasteCategory } from '@/types/database'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '@/components/ui/submit-button'
import { formatMoney } from '@/lib/utils'
import { cn } from '@/lib/utils'

const CATEGORY_META: Record<string, { icon: LucideIcon; key: string }> = {
  Spoilage: { icon: AlertTriangle, key: 'spoilage' },
  'Over-prep': { icon: ChefHat, key: 'over_prep' },
  Dropped: { icon: ArrowDownToLine, key: 'dropped' },
  Expired: { icon: CalendarX, key: 'expired' },
  Other: { icon: MoreHorizontal, key: 'other' },
}

export function WasteForm({
  locale,
  defaultDate,
  ingredients,
  categories,
  stockLevels,
}: {
  locale: string
  defaultDate: string
  ingredients: IngredientOption[]
  categories: WasteCategory[]
  stockLevels: Record<string, number>
}) {
  const t = useTranslations()
  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const action = submitWaste.bind(null, locale)
  const [state, formAction] = useFormState<InventoryActionResult, FormData>(
    action,
    {}
  )

  const selected = ingredients.find((i) => i.id === ingredientId)
  const qtyNum = quantity === '' ? 0 : Number(quantity)
  const onHand = ingredientId ? (stockLevels[ingredientId] ?? 0) : 0
  const value = qtyNum * (selected?.cost_per_unit ?? 0)
  const overStock = !!selected && qtyNum > onHand

  const payload = useMemo(
    () =>
      JSON.stringify({
        ingredient_id: ingredientId,
        quantity: qtyNum,
        waste_category_id: categoryId,
        occurred_at: date,
        reason,
        notes,
      }),
    [ingredientId, qtyNum, categoryId, date, reason, notes]
  )

  return (
    <form action={formAction} className="space-y-5 stokly-card p-5">
      <input type="hidden" name="payload" value={payload} />

      <div className="space-y-2">
        <Label htmlFor="waste_date">{t('inventory.waste_date')}</Label>
        <Input
          id="waste_date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ingredient">{t('recipes.line_ingredient')}</Label>
        <select
          id="ingredient"
          value={ingredientId}
          onChange={(e) => setIngredientId(e.target.value)}
          className="flex h-[38px] w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
        >
          <option value="">{t('recipes.select_ingredient')}</option>
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        {selected && (
          <p className="text-xs text-muted-foreground">
            {t('inventory.on_hand')}:{' '}
            <span className="font-mono tabular-nums text-foreground">
              {onHand} {selected.unit}
            </span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="quantity">{t('inventory.waste_quantity')}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="quantity"
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="text-right font-mono tabular-nums"
          />
          <span className="w-12 text-sm text-muted-foreground">
            {selected?.unit ?? ''}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={cn('flex items-center gap-1', overStock ? 'text-amber-600' : 'text-transparent')}>
            <AlertTriangle className="h-3.5 w-3.5" />
            {overStock ? t('inventory.over_stock_warning') : ' '}
          </span>
          {value > 0 && (
            <span className="text-muted-foreground">
              {t('inventory.waste_value')}:{' '}
              <span className="font-mono tabular-nums text-foreground">
                {formatMoney(value)}
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('inventory.waste_category')}</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const meta = CATEGORY_META[c.name]
            const Icon = meta?.icon ?? MoreHorizontal
            const label = meta ? t(`waste_category.${meta.key}`) : c.name
            const isSel = categoryId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  isSel
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">{t('inventory.waste_reason')}</Label>
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('inventory.waste_reason_ph')}
        />
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

      <SubmitButton
        pendingText={t('common.saving')}
        disabled={!ingredientId || !categoryId || qtyNum <= 0}
      >
        {t('inventory.log_waste')}
      </SubmitButton>
    </form>
  )
}
