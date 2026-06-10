'use client'

import { useMemo, useState } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import {
  executeProductionRun,
  type ProductionResult,
} from '@/app/[locale]/app/(protected)/production/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '@/components/ui/submit-button'
import { formatMoney } from '@/lib/utils'

interface IngOpt {
  id: string
  name: string
  unit: string
  cost_per_unit: number
}
interface RecipeOpt {
  id: string
  name: string
  serving_size: number | null
}
interface InputLine {
  key: string
  ingredient_id: string
  quantity: string
}

let counter = 0
const newKey = () => `p-${(counter += 1)}`

export function ProductionForm({
  locale,
  ingredients,
  recipes,
  recipeLines,
}: {
  locale: string
  ingredients: IngOpt[]
  recipes: RecipeOpt[]
  recipeLines: Record<string, { ingredient_id: string; quantity: number }[]>
}) {
  const t = useTranslations()
  const [outputId, setOutputId] = useState('')
  const [outputQty, setOutputQty] = useState('')
  const [recipeId, setRecipeId] = useState('')
  const [expiry, setExpiry] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<InputLine[]>([
    { key: newKey(), ingredient_id: '', quantity: '' },
  ])

  const action = executeProductionRun.bind(null, locale)
  const [state, formAction] = useFormState<ProductionResult, FormData>(action, {})

  const costById = useMemo(
    () => new Map(ingredients.map((i) => [i.id, i.cost_per_unit])),
    [ingredients]
  )
  const unitById = useMemo(
    () => new Map(ingredients.map((i) => [i.id, i.unit])),
    [ingredients]
  )

  function patch(key: string, p: Partial<InputLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)))
  }
  function addLine() {
    setLines((prev) => [...prev, { key: newKey(), ingredient_id: '', quantity: '' }])
  }
  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  // Pre-fill the input rows from a chosen recipe template (one batch).
  function selectRecipe(id: string) {
    setRecipeId(id)
    const src = recipeLines[id]
    if (src && src.length > 0) {
      setLines(
        src.map((s) => ({
          key: newKey(),
          ingredient_id: s.ingredient_id,
          quantity: String(s.quantity),
        }))
      )
    }
  }

  const totalInputCost = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const q = Number(l.quantity)
        const c = costById.get(l.ingredient_id) ?? 0
        return sum + (Number.isFinite(q) ? q * c : 0)
      }, 0),
    [lines, costById]
  )
  const totalInputQty = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0),
    [lines]
  )
  const outQ = Number(outputQty) || 0
  const outputUnitCost = outQ > 0 ? totalInputCost / outQ : 0
  const yieldPct = totalInputQty > 0 ? (outQ / totalInputQty) * 100 : 0

  const payload = useMemo(
    () =>
      JSON.stringify({
        output_ingredient_id: outputId,
        output_quantity: outputQty === '' ? 0 : Number(outputQty),
        expiry_date: expiry,
        recipe_id: recipeId,
        notes,
        inputs: lines
          .filter((l) => l.ingredient_id && l.quantity !== '')
          .map((l) => ({ ingredient_id: l.ingredient_id, quantity: Number(l.quantity) })),
      }),
    [outputId, outputQty, expiry, recipeId, notes, lines]
  )

  const selectCls =
    'flex h-9 w-full rounded-md border border-input bg-card px-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15'
  const errKey =
    state.error === 'kitchen_short'
      ? 'production.kitchen_short'
      : state.error
        ? 'common.error'
        : null

  return (
    <form action={formAction} className="max-w-3xl space-y-5">
      <input type="hidden" name="payload" value={payload} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="output">{t('production.output')}</Label>
          <select
            id="output"
            value={outputId}
            onChange={(e) => setOutputId(e.target.value)}
            className={selectCls.replace('h-9', 'h-[38px]')}
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
          <Label htmlFor="outqty">{t('production.output_qty')}</Label>
          <Input
            id="outqty"
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0"
            value={outputQty}
            onChange={(e) => setOutputQty(e.target.value)}
            className="text-right font-mono tabular-nums"
          />
        </div>
      </div>

      {recipes.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="recipe">{t('production.recipe_template')}</Label>
          <select
            id="recipe"
            value={recipeId}
            onChange={(e) => selectRecipe(e.target.value)}
            className={selectCls.replace('h-9', 'h-[38px]')}
          >
            <option value="">{t('production.no_template')}</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {t('production.recipe_template_hint')}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-semibold">{t('production.inputs')}</Label>
        {lines.map((line) => (
          <div
            key={line.key}
            className="grid grid-cols-[1fr_120px_40px] items-end gap-2"
          >
            <div className="space-y-1">
              <select
                value={line.ingredient_id}
                onChange={(e) => patch(line.key, { ingredient_id: e.target.value })}
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
            <Input
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              value={line.quantity}
              onChange={(e) => patch(line.key, { quantity: e.target.value })}
              placeholder={unitById.get(line.ingredient_id) ?? ''}
              className="text-right font-mono tabular-nums"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLine(line.key)}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('production.add_input')}
        </Button>
      </div>

      <div className="space-y-1">
        <Label htmlFor="expiry">{t('inventory.expiry_date')}</Label>
        <Input
          id="expiry"
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="max-w-[200px] font-mono"
        />
        <p className="text-xs text-muted-foreground">{t('production.expiry_hint')}</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">{t('inventory.notes')}</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {/* Live cost + yield */}
      <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-secondary/30 p-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('production.input_cost')}
          </p>
          <p className="mt-0.5 font-mono font-semibold">{formatMoney(totalInputCost)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('production.output_unit_cost')}
          </p>
          <p className="mt-0.5 font-mono font-semibold">{formatMoney(outputUnitCost)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('production.yield')}
          </p>
          <p className="mt-0.5 font-mono font-semibold">{yieldPct.toFixed(1)}%</p>
        </div>
      </div>

      {errKey && <p className="text-sm text-destructive">{t(errKey)}</p>}

      <div className="flex gap-2">
        <SubmitButton pendingText={t('common.saving')}>
          {t('production.produce')}
        </SubmitButton>
        <Button asChild variant="outline" type="button">
          <Link href="/app/production">{t('common.cancel')}</Link>
        </Button>
      </div>
    </form>
  )
}
