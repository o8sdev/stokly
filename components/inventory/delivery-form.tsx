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
import { formatMoney } from '@/lib/utils'

interface Line {
  key: string
  ingredient_id: string
  quantity: string
  unit_cost: string
  expiry_date: string
}

let counter = 0
const newKey = () => `d-${(counter += 1)}`

export function DeliveryForm({
  locale,
  ingredients,
  suppliers,
}: {
  locale: string
  ingredients: IngredientOption[]
  suppliers: SupplierOption[]
}) {
  const t = useTranslations()
  const [supplierId, setSupplierId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([
    { key: newKey(), ingredient_id: '', quantity: '', unit_cost: '', expiry_date: '' },
  ])

  const action = submitDelivery.bind(null, locale)
  const [state, formAction] = useFormState<InventoryActionResult, FormData>(
    action,
    {}
  )

  function patch(key: string, p: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)))
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: newKey(), ingredient_id: '', quantity: '', unit_cost: '', expiry_date: '' },
    ])
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  // Default the unit cost to the ingredient's current price when selected.
  function selectIngredient(key: string, id: string) {
    const opt = ingredients.find((i) => i.id === id)
    patch(key, {
      ingredient_id: id,
      unit_cost: opt ? String(opt.cost_per_unit) : '',
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
        supplier_id: supplierId,
        notes,
        lines: lines
          .filter((l) => l.ingredient_id && l.quantity !== '')
          .map((l) => ({
            ingredient_id: l.ingredient_id,
            quantity: Number(l.quantity),
            unit_cost: l.unit_cost === '' ? 0 : Number(l.unit_cost),
            expiry_date: l.expiry_date,
          })),
      }),
    [supplierId, notes, lines]
  )

  return (
    <form action={formAction} className="max-w-3xl space-y-5">
      <input type="hidden" name="payload" value={payload} />

      <div className="space-y-2">
        <Label htmlFor="supplier">{t('inventory.delivery_supplier')}</Label>
        <select
          id="supplier"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="flex h-[38px] w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
        >
          <option value="">{t('ingredients.no_supplier')}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {lines.map((line) => {
          const opt = ingredients.find((i) => i.id === line.ingredient_id)
          return (
            <div
              key={line.key}
              className="grid grid-cols-2 items-end gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_104px_104px_150px_40px]"
            >
              <div className="col-span-2 space-y-1 md:col-span-1">
                <Label className="text-xs">
                  {t('inventory.delivery')} — {t('recipes.line_ingredient')}
                </Label>
                <select
                  value={line.ingredient_id}
                  onChange={(e) => selectIngredient(line.key, e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
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
                {opt && <span className="sr-only">{opt.unit}</span>}
              </div>
              <div className="col-span-2 space-y-1 md:col-span-1">
                <Label className="text-xs">
                  {t('inventory.expiry_date')}
                </Label>
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
          <Link href="/app/inventory">{t('common.cancel')}</Link>
        </Button>
      </div>
    </form>
  )
}
