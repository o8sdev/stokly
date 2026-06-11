'use client'

import * as React from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import {
  setIngredientConversion,
  removeIngredientConversion,
  type ActionResult,
} from '@/app/[locale]/app/(protected)/ingredients/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import { UNIT_OPTIONS } from '@/lib/constants/units'

// B4: manage how an ingredient's pack/alt units convert to its base (stock) unit,
// e.g. "1 şüşə = 750 ml". The cost/usage calc + recipe-line validation use these.
export function UnitConversionsPanel({
  locale,
  ingredientId,
  baseUnit,
  conversions,
}: {
  locale: string
  ingredientId: string
  baseUnit: string
  conversions: { unit: string; factor_to_base: number }[]
}) {
  const t = useTranslations('ingredients')
  const [state, action] = useFormState<ActionResult, FormData>(
    setIngredientConversion.bind(null, locale, ingredientId),
    {}
  )
  const [, start] = React.useTransition()

  // Only offer units not already defined and not the base unit itself.
  const taken = new Set([baseUnit, ...conversions.map((c) => c.unit)])
  const available = UNIT_OPTIONS.filter((o) => !taken.has(o.value))

  return (
    <div className="mt-6 max-w-2xl space-y-4 stokly-card p-6">
      <div>
        <h2 className="text-sm font-semibold">{t('conversions_title')}</h2>
        <p className="text-xs text-muted-foreground">
          {t('conversions_help', { base: baseUnit })}
        </p>
      </div>

      {conversions.length > 0 && (
        <ul className="space-y-1.5">
          {conversions.map((c) => (
            <li
              key={c.unit}
              className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="font-mono tabular-nums">
                1 {c.unit} = {c.factor_to_base} {baseUnit}
              </span>
              <button
                type="button"
                onClick={() =>
                  start(() =>
                    removeIngredientConversion(locale, ingredientId, c.unit)
                  )
                }
                className="text-muted-foreground transition-colors hover:text-destructive"
                aria-label={t('conversions_remove')}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 ? (
        <form
          key={conversions.length}
          action={action}
          className="flex flex-wrap items-end gap-2"
        >
          <div className="space-y-1">
            <Label htmlFor="conv_unit" className="text-xs">
              {t('conversions_unit')}
            </Label>
            <select
              id="conv_unit"
              name="unit"
              required
              defaultValue=""
              className="flex h-[38px] w-36 rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            >
              <option value="" disabled>
                {t('select_unit')}
              </option>
              {available.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(`units.${o.key}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="conv_factor" className="text-xs">
              {t('conversions_factor', { base: baseUnit })}
            </Label>
            <Input
              id="conv_factor"
              name="factor"
              type="number"
              step="0.000001"
              min="0"
              required
              className="w-32 text-right font-mono tabular-nums"
            />
          </div>
          <SubmitButton className="h-[38px]">
            {t('conversions_add')}
          </SubmitButton>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t('conversions_all_set')}
        </p>
      )}

      {state.error && (
        <p className="text-sm text-destructive">
          {state.error === 'same_unit'
            ? t('conversions_same_unit')
            : t('conversions_error')}
        </p>
      )}
    </div>
  )
}
