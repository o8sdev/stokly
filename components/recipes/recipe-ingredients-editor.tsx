'use client'

import { useTranslations } from 'next-intl'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import type {
  EditorLine,
  IngredientOption,
  SubRecipeOption,
} from '@/types/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldHint } from '@/components/ui/field-hint'
import { MonoValue } from '@/components/ui/stokly-theme'
import { ingredientLineCost } from '@/lib/calculations/food-cost'
import { UNIT_OPTIONS, UNIT_VALUES } from '@/lib/constants/units'

export function RecipeIngredientsEditor({
  lines,
  ingredientOptions,
  subRecipeOptions,
  onChange,
  onRemove,
  onAddIngredient,
  onAddSubRecipe,
}: {
  lines: EditorLine[]
  ingredientOptions: IngredientOption[]
  subRecipeOptions: SubRecipeOption[]
  onChange: (key: string, patch: Partial<EditorLine>) => void
  onRemove: (key: string) => void
  onAddIngredient: () => void
  onAddSubRecipe: () => void
}) {
  const t = useTranslations('recipes')
  const tUnits = useTranslations('ingredients.units')

  function lineCost(line: EditorLine): number {
    const qty = Number(line.quantity)
    if (!Number.isFinite(qty) || qty <= 0) return 0

    if (line.kind === 'ingredient') {
      const opt = ingredientOptions.find((o) => o.id === line.sourceId)
      if (!opt) return 0
      const override = line.yieldOverride
        ? Number(line.yieldOverride) / 100
        : null
      const yieldPercent = override ?? opt.yield_percent ?? 1
      return ingredientLineCost(qty, opt.cost_per_unit, yieldPercent)
    }

    const sub = subRecipeOptions.find((o) => o.id === line.sourceId)
    if (!sub) return 0
    return qty * sub.unitCost
  }

  return (
    <div className="space-y-2">
      {/* Desktop column header */}
      <div className="hidden grid-cols-[20px_1fr_92px_96px_84px_92px_32px] items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground md:grid">
        <span />
        <span>{t('line_ingredient')}</span>
        <span className="text-right">{t('line_quantity')}</span>
        <span className="flex items-center gap-1">
          {t('line_unit')}
          <FieldHint text={t('line_unit_hint')} />
        </span>
        <span className="flex items-center justify-end gap-1 text-right">
          {t('line_yield_override')}
          <FieldHint text={t('line_yield_hint')} />
        </span>
        <span className="text-right">{t('line_cost')}</span>
        <span />
      </div>

      {lines.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {t('no_lines')}
        </p>
      )}

      {lines.map((line) => {
        const options =
          line.kind === 'ingredient' ? ingredientOptions : subRecipeOptions
        const opt =
          line.kind === 'ingredient'
            ? ingredientOptions.find((o) => o.id === line.sourceId)
            : undefined
        return (
          <div
            key={line.key}
            className="animate-line-in grid grid-cols-2 items-center gap-2 rounded-lg border border-border bg-card p-2 md:grid-cols-[20px_1fr_92px_96px_84px_92px_32px] md:border-transparent md:bg-transparent md:p-0"
          >
            {/* Drag handle (visual affordance) */}
            <span className="hidden cursor-grab items-center justify-center text-muted-foreground/50 md:flex">
              <GripVertical className="h-4 w-4" />
            </span>

            <div className="col-span-2 md:col-span-1">
              <select
                value={line.sourceId}
                onChange={(e) => {
                  const id = e.target.value
                  if (line.kind === 'ingredient') {
                    // No unit conversion happens downstream, so default the
                    // line unit to the chosen ingredient's own unit.
                    const picked = ingredientOptions.find((o) => o.id === id)
                    onChange(line.key, {
                      sourceId: id,
                      unit: picked?.unit ?? line.unit,
                    })
                  } else {
                    onChange(line.key, { sourceId: id })
                  }
                }}
                className="flex h-9 w-full rounded-md border border-input bg-card px-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
              >
                <option value="">
                  {line.kind === 'ingredient'
                    ? t('select_ingredient')
                    : t('select_sub_recipe')}
                </option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              type="number"
              inputMode="decimal"
              step="0.0001"
              min="0"
              value={line.quantity}
              placeholder="0"
              onChange={(e) => onChange(line.key, { quantity: e.target.value })}
              className="h-9 text-right font-mono tabular-nums"
            />

            {line.kind === 'ingredient' ? (
              <select
                value={line.unit}
                onChange={(e) => onChange(line.key, { unit: e.target.value })}
                aria-label={t('line_unit')}
                className="flex h-9 w-full rounded-md border border-input bg-card px-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
              >
                <option value="">{t('line_unit')}</option>
                {line.unit && !UNIT_VALUES.includes(line.unit) && (
                  <option value={line.unit}>{line.unit}</option>
                )}
                {UNIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {tUnits(o.key)}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={line.unit}
                placeholder={t('line_unit')}
                onChange={(e) => onChange(line.key, { unit: e.target.value })}
                className="h-9"
              />
            )}

            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="100"
              value={line.yieldOverride}
              placeholder={
                line.kind === 'ingredient' && opt
                  ? String(Math.round((opt.yield_percent ?? 1) * 100))
                  : '%'
              }
              disabled={line.kind === 'sub_recipe'}
              onChange={(e) =>
                onChange(line.key, { yieldOverride: e.target.value })
              }
              className="h-9 text-right font-mono tabular-nums"
            />

            <span className="text-right">
              <MonoValue
                value={lineCost(line).toFixed(2)}
                className="font-medium text-primary"
              />
            </span>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(line.key)}
              aria-label="Delete line"
              className="h-8 w-8 hover:bg-[#FEF2F2] hover:text-[#E53E3E]"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      })}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onAddIngredient}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {t('add_ingredient')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onAddSubRecipe}
          className="gap-2"
          disabled={subRecipeOptions.length === 0}
        >
          <Plus className="h-4 w-4" />
          {t('add_sub_recipe')}
        </Button>
      </div>
    </div>
  )
}
