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
import { Link } from '@/lib/i18n/navigation'
import { submitWaste } from '@/app/[locale]/(dashboard)/inventory/actions'
import type { InventoryActionResult } from '@/app/[locale]/(dashboard)/inventory/actions'
import type { IngredientOption } from '@/types/app'
import type { WasteCategory } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '@/components/ui/submit-button'
import { cn } from '@/lib/utils'

// Map the seeded English category names to an icon + i18n key.
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
}: {
  locale: string
  defaultDate: string
  ingredients: IngredientOption[]
  categories: WasteCategory[]
}) {
  const t = useTranslations()
  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [notes, setNotes] = useState('')

  const action = submitWaste.bind(null, locale)
  const [state, formAction] = useFormState<InventoryActionResult, FormData>(
    action,
    {}
  )

  const selected = ingredients.find((i) => i.id === ingredientId)

  const payload = useMemo(
    () =>
      JSON.stringify({
        ingredient_id: ingredientId,
        quantity: quantity === '' ? 0 : Number(quantity),
        waste_category_id: categoryId,
        occurred_at: date,
        notes,
      }),
    [ingredientId, quantity, categoryId, date, notes]
  )

  return (
    <form action={formAction} className="max-w-lg space-y-5 stokly-card p-6">
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
      </div>

      <div className="space-y-2">
        <Label>{t('inventory.waste_category')}</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const meta = CATEGORY_META[c.name]
            const Icon = meta?.icon ?? MoreHorizontal
            const label = meta
              ? t(`waste_category.${meta.key}`)
              : c.name
            const selected = categoryId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  selected
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
        <SubmitButton
          pendingText={t('common.saving')}
          disabled={!ingredientId || !categoryId}
        >
          {t('common.save')}
        </SubmitButton>
        <Button asChild variant="outline" type="button">
          <Link href="/inventory">{t('common.cancel')}</Link>
        </Button>
      </div>
    </form>
  )
}
