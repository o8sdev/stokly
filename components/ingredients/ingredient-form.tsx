'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import type { Ingredient, Supplier } from '@/types/database'
import {
  createIngredient,
  updateIngredient,
  type ActionResult,
} from '@/app/[locale]/app/(protected)/ingredients/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SubmitButton } from '@/components/ui/submit-button'
import { FieldHint } from '@/components/ui/field-hint'
import { UNIT_OPTIONS, packPresetsFor } from '@/lib/constants/units'

export function IngredientForm({
  locale,
  suppliers,
  ingredient,
}: {
  locale: string
  suppliers: Supplier[]
  ingredient?: Ingredient
}) {
  const t = useTranslations()
  const isEdit = Boolean(ingredient)

  const action = isEdit
    ? updateIngredient.bind(null, locale, ingredient!.id)
    : createIngredient.bind(null, locale)

  const [state, formAction] = useFormState<ActionResult, FormData>(action, {})

  const yieldDisplay = ingredient
    ? Math.round(ingredient.yield_percent * 1000) / 10
    : 100

  // Produced-good toggle controls visibility of shelf-life + storage fields.
  const [isProduced, setIsProduced] = useState(
    ingredient?.is_produced ?? false
  )

  // NEW ingredients can define pack/alt unit conversions right away (e.g.
  // "1 şüşə = 0.75 l") instead of only after saving — rows are serialized into
  // a hidden field and inserted with the ingredient. Edits keep the dedicated
  // panel on the detail page (it manages existing rows).
  const [baseUnit, setBaseUnit] = useState(ingredient?.unit ?? '')
  const [costVal, setCostVal] = useState(
    ingredient ? String(ingredient.cost_per_unit) : ''
  )
  const [convRows, setConvRows] = useState<{ unit: string; factor: string }[]>(
    []
  )

  // Preserve a legacy/free-text unit (e.g. imported "kg") as an extra option so
  // editing never silently drops it.
  const knownUnits: string[] = UNIT_OPTIONS.map((o) => o.value)
  const legacyUnit =
    ingredient?.unit && !knownUnits.includes(ingredient.unit)
      ? ingredient.unit
      : null

  return (
    <form action={formAction} className="max-w-2xl space-y-5 stokly-card p-6">
      <div className="space-y-2">
        <Label htmlFor="name">{t('ingredients.name')}</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={ingredient?.name ?? ''}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name_az">{t('ingredients.name_az')}</Label>
          <Input
            id="name_az"
            name="name_az"
            defaultValue={ingredient?.name_az ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name_ru">{t('ingredients.name_ru')}</Label>
          <Input
            id="name_ru"
            name="name_ru"
            defaultValue={ingredient?.name_ru ?? ''}
          />
        </div>
      </div>

      {/* Multi-column rows: each cell is a flex column with the control pinned
          to the bottom (mt-auto), so inputs stay aligned even when a label +
          hint wraps to a second line on narrow widths. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="unit">{t('ingredients.unit')}</Label>
          <select
            id="unit"
            name="unit"
            required
            defaultValue={ingredient?.unit ?? ''}
            onChange={(e) => setBaseUnit(e.target.value)}
            className="mt-auto flex h-[38px] w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
          >
            <option value="" disabled>
              {t('ingredients.select_unit')}
            </option>
            {legacyUnit && <option value={legacyUnit}>{legacyUnit}</option>}
            {UNIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(`ingredients.units.${o.key}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="cost_per_unit">{t('ingredients.cost')}</Label>
            <FieldHint text={t('ingredients.cost_hint')} />
          </div>
          <Input
            id="cost_per_unit"
            name="cost_per_unit"
            onChange={(e) => setCostVal(e.target.value)}
            type="number"
            step="0.0001"
            min="0"
            required
            defaultValue={ingredient?.cost_per_unit ?? 0}
            className="mt-auto text-right font-mono tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="yield_percent_display">
              {t('ingredients.yield')}
            </Label>
            <FieldHint text={t('ingredients.yield_hint')} />
          </div>
          <Input
            id="yield_percent_display"
            name="yield_percent_display"
            type="number"
            step="0.1"
            min="0.1"
            max="100"
            required
            defaultValue={yieldDisplay}
            className="mt-auto text-right font-mono tabular-nums"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="supplier_id">{t('ingredients.supplier')}</Label>
          {/* Native select keeps the form a plain HTML submission. */}
          <select
            id="supplier_id"
            name="supplier_id"
            defaultValue={ingredient?.supplier_id ?? ''}
            className="mt-auto flex h-[38px] w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
          >
            <option value="">{t('ingredients.no_supplier')}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="low_stock_threshold">
              {t('ingredients.low_stock')}
            </Label>
            <FieldHint text={t('ingredients.low_stock_hint')} />
          </div>
          <Input
            id="low_stock_threshold"
            name="low_stock_threshold"
            type="number"
            step="0.001"
            min="0"
            defaultValue={ingredient?.low_stock_threshold ?? ''}
            className="mt-auto text-right font-mono tabular-nums"
          />
        </div>
      </div>

      {/* Stock planning: low_stock_threshold above is the reorder trigger; par is
          the build-to-par target the shopping list tops stock back up to. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="par_level">{t('ingredients.par_level')}</Label>
            <FieldHint text={t('ingredients.par_level_hint')} />
          </div>
          <Input
            id="par_level"
            name="par_level"
            type="number"
            step="0.001"
            min="0"
            defaultValue={ingredient?.par_level ?? ''}
            className="mt-auto text-right font-mono tabular-nums"
          />
        </div>
        <div className="flex items-end pb-2">
          <p className="text-xs text-muted-foreground">
            {t('ingredients.par_level_note')}
          </p>
        </div>
      </div>

      {/* Produced-good fields */}
      <div className="space-y-4 rounded-lg border border-border bg-secondary/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="is_produced">{t('ingredients.is_produced')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('ingredients.is_produced_help')}
            </p>
          </div>
          <Switch
            id="is_produced"
            name="is_produced"
            checked={isProduced}
            onCheckedChange={setIsProduced}
          />
        </div>

        {isProduced && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="default_shelf_life_days">
                {t('ingredients.shelf_life')}
              </Label>
              <Input
                id="default_shelf_life_days"
                name="default_shelf_life_days"
                type="number"
                min="1"
                step="1"
                defaultValue={ingredient?.default_shelf_life_days ?? ''}
                className="text-right font-mono tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storage_location">
                {t('ingredients.storage_location')}
              </Label>
              <Input
                id="storage_location"
                name="storage_location"
                placeholder={t('ingredients.storage_placeholder')}
                defaultValue={ingredient?.storage_location ?? ''}
              />
            </div>
          </div>
        )}
      </div>

      {!isEdit && (
        <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-4">
          <div className="flex items-center gap-1.5">
            <Label>{t('ingredients.conversions_title')}</Label>
            <FieldHint text={t('ingredients.conversions_help', { base: baseUnit || '—' })} />
          </div>
          {convRows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">1</span>
              <select
                value={r.unit}
                onChange={(e) =>
                  setConvRows((rows) =>
                    rows.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x))
                  )
                }
                aria-label={t('ingredients.conversions_unit')}
                className="flex h-9 w-32 rounded-md border border-input bg-card px-2 text-sm"
              >
                <option value="">{t('ingredients.select_unit')}</option>
                {UNIT_OPTIONS.filter((o) => o.value !== baseUnit).map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(`ingredients.units.${o.key}`)}
                  </option>
                ))}
              </select>
              <span className="text-sm text-muted-foreground">=</span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.000001"
                min="0"
                value={r.factor}
                onChange={(e) =>
                  setConvRows((rows) =>
                    rows.map((x, j) => (j === i ? { ...x, factor: e.target.value } : x))
                  )
                }
                aria-label={t('ingredients.conversions_factor', { base: baseUnit || '—' })}
                className="h-9 w-28 text-right font-mono tabular-nums"
              />
              <span className="text-sm text-muted-foreground">{baseUnit || '—'}</span>
              {Number(r.factor) > 0 && Number(costVal) > 0 && (
                <span className="font-mono text-xs text-primary">
                  ≈ {(Number(r.factor) * Number(costVal)).toFixed(2)} AZN
                </span>
              )}
              <button
                type="button"
                onClick={() => setConvRows((rows) => rows.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive"
                aria-label={t('ingredients.conversions_remove')}
              >
                ×
              </button>
            </div>
          ))}
          {baseUnit && packPresetsFor(baseUnit).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {t('ingredients.conversions_presets')}
              </span>
              {packPresetsFor(baseUnit).map((pz) => (
                <button
                  key={pz.label}
                  type="button"
                  onClick={() =>
                    setConvRows((rows) => [
                      ...rows.filter((r) => r.unit || r.factor),
                      { unit: pz.unit, factor: String(pz.factor) },
                    ])
                  }
                  className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {pz.label}
                </button>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConvRows((rows) => [...rows, { unit: '', factor: '' }])}
          >
            + {t('ingredients.conversions_add')}
          </Button>
          <input
            type="hidden"
            name="conversions"
            value={JSON.stringify(
              convRows
                .filter((r) => r.unit && Number(r.factor) > 0)
                .map((r) => ({ unit: r.unit, factor: Number(r.factor) }))
            )}
          />
        </div>
      )}

      {state.error && (
        <p className="text-sm text-destructive">{t('common.error')}</p>
      )}

      <div className="flex gap-2">
        <SubmitButton pendingText={t('common.saving')}>
          {t('common.save')}
        </SubmitButton>
        <Button asChild variant="outline" type="button">
          <Link href="/app/ingredients">{t('common.cancel')}</Link>
        </Button>
      </div>
    </form>
  )
}
