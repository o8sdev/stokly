'use client'

import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import type { Ingredient, Supplier } from '@/types/database'
import {
  createIngredient,
  updateIngredient,
  type ActionResult,
} from '@/app/[locale]/(dashboard)/ingredients/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

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
          <Input
            id="unit"
            name="unit"
            required
            placeholder="kg"
            defaultValue={ingredient?.unit ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost_per_unit">{t('ingredients.cost')}</Label>
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
          <Label htmlFor="yield_percent_display">
            {t('ingredients.yield')}
          </Label>
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
      <p className="text-xs text-muted-foreground">{t('ingredients.yield_help')}</p>

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
          <Label htmlFor="low_stock_threshold">
            {t('ingredients.low_stock')}
          </Label>
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

      {state.error && (
        <p className="text-sm text-destructive">{t('common.error')}</p>
      )}

      <div className="flex gap-2">
        <SubmitButton pendingText={t('common.saving')}>
          {t('common.save')}
        </SubmitButton>
        <Button asChild variant="outline" type="button">
          <Link href="/ingredients">{t('common.cancel')}</Link>
        </Button>
      </div>
    </form>
  )
}
