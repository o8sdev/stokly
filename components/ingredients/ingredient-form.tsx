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
import { UNIT_OPTIONS } from '@/lib/constants/units'

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="unit">{t('ingredients.unit')}</Label>
          <select
            id="unit"
            name="unit"
            required
            defaultValue={ingredient?.unit ?? ''}
            className="flex h-[38px] w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
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
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="cost_per_unit">{t('ingredients.cost')}</Label>
            <FieldHint text={t('ingredients.cost_hint')} />
          </div>
          <Input
            id="cost_per_unit"
            name="cost_per_unit"
            type="number"
            step="0.0001"
            min="0"
            required
            defaultValue={ingredient?.cost_per_unit ?? 0}
            className="text-right font-mono tabular-nums"
          />
        </div>
        <div className="space-y-2">
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
            className="text-right font-mono tabular-nums"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supplier_id">{t('ingredients.supplier')}</Label>
          {/* Native select keeps the form a plain HTML submission. */}
          <select
            id="supplier_id"
            name="supplier_id"
            defaultValue={ingredient?.supplier_id ?? ''}
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
            className="text-right font-mono tabular-nums"
          />
        </div>
      </div>

      {/* Stock planning: low_stock_threshold above is the reorder trigger; par is
          the build-to-par target the shopping list tops stock back up to. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
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
            className="text-right font-mono tabular-nums"
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
