'use client'

import { useMemo, useState } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { ArrowRight, Snowflake } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { submitTransfer } from '@/app/[locale]/app/(protected)/inventory/actions'
import type { InventoryActionResult } from '@/app/[locale]/app/(protected)/inventory/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import { formatQuantity } from '@/lib/utils'

interface IngOpt {
  id: string
  name: string
  unit: string
}
interface LocOpt {
  id: string
  name: string
  is_frozen: boolean
}
interface StockEntry {
  ingredient_id: string
  location_id: string | null
  qty: number
}

export function TransferForm({
  locale,
  ingredients,
  locations,
  stock,
}: {
  locale: string
  ingredients: IngOpt[]
  locations: LocOpt[]
  stock: StockEntry[]
}) {
  const t = useTranslations()
  const [ingredientId, setIngredientId] = useState('')
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [expiry, setExpiry] = useState('')

  const action = submitTransfer.bind(null, locale)
  const [state, formAction] = useFormState<InventoryActionResult, FormData>(
    action,
    {}
  )

  const ing = ingredients.find((i) => i.id === ingredientId)
  const available = useMemo(
    () =>
      stock.find(
        (s) => s.ingredient_id === ingredientId && s.location_id === fromId
      )?.qty ?? 0,
    [stock, ingredientId, fromId]
  )
  const destFrozen = locations.find((l) => l.id === toId)?.is_frozen ?? false
  const overdraw = Number(quantity) > available + 1e-9

  const payload = useMemo(
    () =>
      JSON.stringify({
        ingredient_id: ingredientId,
        from_location_id: fromId,
        to_location_id: toId,
        quantity: quantity === '' ? 0 : Number(quantity),
        expiry_date: expiry,
      }),
    [ingredientId, fromId, toId, quantity, expiry]
  )

  const selectCls =
    'flex h-[38px] w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15'

  const errorKey =
    state.error === 'insufficient'
      ? 'inventory.transfer_insufficient'
      : state.error === 'same_location'
        ? 'inventory.transfer_same_location'
        : state.error
          ? 'common.error'
          : null

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <input type="hidden" name="payload" value={payload} />

      <div className="space-y-2">
        <Label htmlFor="ingredient">{t('recipes.line_ingredient')}</Label>
        <select
          id="ingredient"
          value={ingredientId}
          onChange={(e) => setIngredientId(e.target.value)}
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

      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="space-y-2">
          <Label htmlFor="from">{t('inventory.from_location')}</Label>
          <select
            id="from"
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className={selectCls}
          >
            <option value="">—</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground sm:mb-3 sm:block" />
        <div className="space-y-2">
          <Label htmlFor="to">{t('inventory.to_location')}</Label>
          <select
            id="to"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className={selectCls}
          >
            <option value="">—</option>
            {locations
              .filter((l) => l.id !== fromId)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {ingredientId && fromId && (
        <p className="text-xs text-muted-foreground">
          {t('inventory.available_here')}:{' '}
          <span className="font-mono">
            {formatQuantity(available)} {ing?.unit ?? ''}
          </span>
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="qty">{t('inventory.delivery_quantity')}</Label>
        <Input
          id="qty"
          type="number"
          inputMode="decimal"
          step="0.001"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="max-w-[200px] text-right font-mono tabular-nums"
        />
        {overdraw && (
          <p className="text-xs text-destructive">
            {t('inventory.transfer_insufficient')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiry" className="flex items-center gap-1.5">
          {t('inventory.new_use_by')}
          {destFrozen && <Snowflake className="h-3.5 w-3.5 text-sky-500" />}
        </Label>
        <Input
          id="expiry"
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="max-w-[200px] font-mono"
        />
        <p className="text-xs text-muted-foreground">
          {destFrozen
            ? t('inventory.new_use_by_frozen')
            : t('inventory.new_use_by_hint')}
        </p>
      </div>

      {errorKey && <p className="text-sm text-destructive">{t(errorKey)}</p>}

      <div className="flex gap-2">
        <SubmitButton pendingText={t('common.saving')}>
          {t('inventory.move_stock')}
        </SubmitButton>
        <Button asChild variant="outline" type="button">
          <Link href="/app/inventory">{t('common.cancel')}</Link>
        </Button>
      </div>
    </form>
  )
}
