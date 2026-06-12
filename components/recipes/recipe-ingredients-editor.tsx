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
import { useState } from 'react'
import {
  UNIT_OPTIONS,
  UNIT_VALUES,
  toBaseUnit,
  allowedUnitsFor,
  packPresetsFor,
} from '@/lib/constants/units'

export function RecipeIngredientsEditor({
  lines,
  ingredientOptions,
  subRecipeOptions,
  onChange,
  onRemove,
  onAddIngredient,
  onAddSubRecipe,
  onAddConversion,
}: {
  lines: EditorLine[]
  ingredientOptions: IngredientOption[]
  subRecipeOptions: SubRecipeOption[]
  onChange: (key: string, patch: Partial<EditorLine>) => void
  onRemove: (key: string) => void
  onAddIngredient: () => void
  onAddSubRecipe: () => void
  // Persist a new pack conversion for an ingredient (server action) and merge
  // it into the options; resolves false on failure.
  onAddConversion: (
    ingredientId: string,
    unit: string,
    factor: number
  ) => Promise<boolean>
}) {
  const t = useTranslations('recipes')
  const tUnits = useTranslations('ingredients.units')
  // Inline "+ new conversion" popover, keyed by line. unit/factor are drafts;
  // busy/err drive the save button state.
  const [conv, setConv] = useState<Record<string, { unit: string; factor: string; busy?: boolean; err?: boolean }>>({})

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
      // Convert the line qty to the ingredient's base unit (metric families +
      // B4 per-ingredient factors) before costing, so a 0.1 q (gram) line on a
      // 10 AZN/kq item costs 0.001 — matching the total above and the server.
      const baseQty = toBaseUnit(
        qty,
        line.unit || opt.unit,
        opt.unit,
        opt.unit_conversions
      )
      return ingredientLineCost(baseQty, opt.cost_per_unit, yieldPercent)
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
                    // Default the line unit to the chosen ingredient's own unit
                    // (the cost calc converts any other unit back to it).
                    const picked = ingredientOptions.find((o) => o.id === id)
                    onChange(line.key, {
                      sourceId: id,
                      unit: picked?.unit ?? line.unit,
                    })
                  } else {
                    // A sub-recipe quantity is ALWAYS in the prep's serving
                    // unit — that's what costing and stock deduction assume —
                    // so the unit is set from the prep, never typed.
                    const picked = subRecipeOptions.find((o) => o.id === id)
                    onChange(line.key, {
                      sourceId: id,
                      unit: picked?.serving_unit || 'porsiya',
                    })
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
                onChange={(e) => {
                  if (e.target.value === '__add') {
                    setConv((c) => ({ ...c, [line.key]: { unit: '', factor: '' } }))
                    return
                  }
                  onChange(line.key, { unit: e.target.value })
                }}
                aria-label={t('line_unit')}
                className="flex h-9 w-full rounded-md border border-input bg-card px-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
              >
                <option value="">{t('line_unit')}</option>
                {line.unit &&
                  opt &&
                  !allowedUnitsFor(opt.unit, opt.unit_conversions).includes(line.unit) && (
                    <option value={line.unit}>{line.unit}</option>
                  )}
                {(opt
                  ? allowedUnitsFor(opt.unit, opt.unit_conversions)
                  : UNIT_VALUES
                ).map((u) => {
                  const known = UNIT_OPTIONS.find((o) => o.value === u)
                  return (
                    <option key={u} value={u}>
                      {known ? tUnits(known.key) : u}
                    </option>
                  )
                })}
                {opt && <option value="__add">{t('add_conversion_option')}</option>}
              </select>
            ) : (
              // Locked to the prep's serving unit — the quantity means
              // "servings of the prep", so a free unit here would only mislead.
              <Input
                value={
                  subRecipeOptions.find((o) => o.id === line.sourceId)
                    ?.serving_unit ||
                  line.unit ||
                  'porsiya'
                }
                readOnly
                disabled
                aria-label={t('line_unit')}
                className="h-9 bg-secondary/50 text-muted-foreground"
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

            {/* Inline "+ conversion" popover: define a pack unit without
                leaving the recipe. Live price preview catches a backwards
                factor instantly (an absurd pack price is self-evident). */}
            {opt && conv[line.key] && (
              <div className="col-span-2 rounded-lg border border-primary/30 bg-primary/[0.04] p-3 md:col-span-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">1</span>
                  <select
                    value={conv[line.key].unit}
                    onChange={(e) =>
                      setConv((c) => ({ ...c, [line.key]: { ...c[line.key], unit: e.target.value, err: false } }))
                    }
                    aria-label={t('line_unit')}
                    className="flex h-9 w-32 rounded-md border border-input bg-card px-2 text-sm"
                  >
                    <option value="">{t('line_unit')}</option>
                    {UNIT_OPTIONS.filter(
                      (o) => !allowedUnitsFor(opt.unit, opt.unit_conversions).includes(o.value)
                    ).map((o) => (
                      <option key={o.value} value={o.value}>
                        {tUnits(o.key)}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-muted-foreground">=</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.000001"
                    min="0"
                    value={conv[line.key].factor}
                    onChange={(e) =>
                      setConv((c) => ({ ...c, [line.key]: { ...c[line.key], factor: e.target.value, err: false } }))
                    }
                    className="h-9 w-28 text-right font-mono tabular-nums"
                  />
                  <span className="text-sm text-muted-foreground">{opt.unit}</span>
                  {Number(conv[line.key].factor) > 0 && (
                    <span className="font-mono text-xs text-primary">
                      ≈ {(Number(conv[line.key].factor) * opt.cost_per_unit).toFixed(2)} AZN
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      conv[line.key].busy ||
                      !conv[line.key].unit ||
                      !(Number(conv[line.key].factor) > 0)
                    }
                    onClick={async () => {
                      const d = conv[line.key]
                      setConv((c) => ({ ...c, [line.key]: { ...d, busy: true, err: false } }))
                      const ok = await onAddConversion(opt.id, d.unit, Number(d.factor))
                      if (ok) {
                        onChange(line.key, { unit: d.unit })
                        setConv((c) => {
                          const next = { ...c }
                          delete next[line.key]
                          return next
                        })
                      } else {
                        setConv((c) => ({ ...c, [line.key]: { ...d, busy: false, err: true } }))
                      }
                    }}
                  >
                    {conv[line.key].busy ? '…' : t('conversion_save')}
                  </Button>
                  <button
                    type="button"
                    onClick={() =>
                      setConv((c) => {
                        const next = { ...c }
                        delete next[line.key]
                        return next
                      })
                    }
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                  {conv[line.key].err && (
                    <span className="text-xs text-destructive">{t('conversion_error')}</span>
                  )}
                </div>
                {packPresetsFor(opt.unit).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {packPresetsFor(opt.unit).map((pz) => (
                      <button
                        key={pz.label}
                        type="button"
                        onClick={() =>
                          setConv((c) => ({
                            ...c,
                            [line.key]: { unit: pz.unit, factor: String(pz.factor) },
                          }))
                        }
                        className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                      >
                        {pz.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      <p className="pt-2 text-xs text-muted-foreground">
        {t('line_kind_hint')}
      </p>
      <div className="flex flex-wrap gap-2">
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
