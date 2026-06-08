'use client'

import { useMemo, useState } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import type {
  EditorLine,
  IngredientOption,
  SubRecipeOption,
} from '@/types/app'
import type { Recipe, RecipeIngredient } from '@/types/database'
import {
  createRecipe,
  updateRecipe,
  type RecipeActionResult,
} from '@/app/[locale]/app/(protected)/recipes/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldHint } from '@/components/ui/field-hint'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { SubmitButton } from '@/components/ui/submit-button'
import { ingredientLineCost } from '@/lib/calculations/food-cost'
import { RecipeIngredientsEditor } from './recipe-ingredients-editor'
import { RecipeCostSummary } from './recipe-cost-summary'

let keyCounter = 0
function nextKey(): string {
  keyCounter += 1
  return `line-${keyCounter}`
}

export function RecipeForm({
  locale,
  ingredientOptions,
  subRecipeOptions,
  recipe,
  existingLines,
}: {
  locale: string
  ingredientOptions: IngredientOption[]
  subRecipeOptions: SubRecipeOption[]
  recipe?: Recipe
  existingLines?: RecipeIngredient[]
}) {
  const t = useTranslations()
  const isEdit = Boolean(recipe)

  // Header field state.
  const [name, setName] = useState(recipe?.name ?? '')
  const [nameAz, setNameAz] = useState(recipe?.name_az ?? '')
  const [nameRu, setNameRu] = useState(recipe?.name_ru ?? '')
  const [isSubRecipe, setIsSubRecipe] = useState(
    recipe?.is_sub_recipe ?? false
  )
  const [servingSize, setServingSize] = useState(
    recipe?.serving_size != null ? String(recipe.serving_size) : ''
  )
  const [servingUnit, setServingUnit] = useState(recipe?.serving_unit ?? '')
  const [salePrice, setSalePrice] = useState(
    recipe?.sale_price != null ? String(recipe.sale_price) : ''
  )
  const [notes, setNotes] = useState(recipe?.notes ?? '')

  // Line state, seeded from existing recipe lines on edit.
  const [lines, setLines] = useState<EditorLine[]>(() => {
    if (!existingLines) return []
    return existingLines.map((l) => ({
      key: nextKey(),
      kind: l.ingredient_id ? 'ingredient' : 'sub_recipe',
      sourceId: l.ingredient_id ?? l.sub_recipe_id ?? '',
      quantity: String(l.quantity),
      unit: l.unit,
      yieldOverride:
        l.yield_override != null
          ? String(Math.round(l.yield_override * 1000) / 10)
          : '',
    }))
  })

  const action = isEdit
    ? updateRecipe.bind(null, locale, recipe!.id)
    : createRecipe.bind(null, locale)

  const [state, formAction] = useFormState<RecipeActionResult, FormData>(
    action,
    {}
  )

  function patchLine(key: string, patch: Partial<EditorLine>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l))
    )
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  function addIngredient() {
    setLines((prev) => [
      ...prev,
      {
        key: nextKey(),
        kind: 'ingredient',
        sourceId: '',
        quantity: '',
        unit: '',
        yieldOverride: '',
      },
    ])
  }

  function addSubRecipe() {
    setLines((prev) => [
      ...prev,
      {
        key: nextKey(),
        kind: 'sub_recipe',
        sourceId: '',
        quantity: '',
        unit: '',
        yieldOverride: '',
      },
    ])
  }

  // Live total cost — recomputed on every render (i.e. every keystroke).
  const totalCost = useMemo(() => {
    return lines.reduce((sum, line) => {
      const qty = Number(line.quantity)
      if (!Number.isFinite(qty) || qty <= 0) return sum
      if (line.kind === 'ingredient') {
        const opt = ingredientOptions.find((o) => o.id === line.sourceId)
        if (!opt) return sum
        const override = line.yieldOverride
          ? Number(line.yieldOverride) / 100
          : null
        const yieldPercent = override ?? opt.yield_percent ?? 1
        return sum + ingredientLineCost(qty, opt.cost_per_unit, yieldPercent)
      }
      const sub = subRecipeOptions.find((o) => o.id === line.sourceId)
      if (!sub) return sum
      return sum + qty * sub.unitCost
    }, 0)
  }, [lines, ingredientOptions, subRecipeOptions])

  // Serialised payload validated by the server action.
  const payload = useMemo(
    () =>
      JSON.stringify({
        name,
        name_az: nameAz,
        name_ru: nameRu,
        is_sub_recipe: isSubRecipe,
        serving_size: servingSize === '' ? '' : Number(servingSize),
        serving_unit: servingUnit,
        sale_price: salePrice === '' ? '' : Number(salePrice),
        notes,
        lines: lines
          .filter((l) => l.sourceId)
          .map((l) => ({
            kind: l.kind,
            sourceId: l.sourceId,
            quantity: l.quantity === '' ? 0 : Number(l.quantity),
            unit: l.unit,
            yieldOverride:
              l.yieldOverride === '' ? '' : Number(l.yieldOverride),
          })),
      }),
    [
      name,
      nameAz,
      nameRu,
      isSubRecipe,
      servingSize,
      servingUnit,
      salePrice,
      notes,
      lines,
    ]
  )

  const parsedServing = servingSize === '' ? null : Number(servingSize)

  return (
    <form action={formAction}>
      <input type="hidden" name="payload" value={payload} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Main column */}
        <div className="space-y-6">
          <div className="space-y-4 stokly-card p-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-muted-foreground">
                {t('recipes.name')}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t('recipes.name')}
                className="h-12 text-xl font-medium"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name_az">{t('recipes.name_az')}</Label>
                <Input
                  id="name_az"
                  value={nameAz}
                  onChange={(e) => setNameAz(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_ru">{t('recipes.name_ru')}</Label>
                <Input
                  id="name_ru"
                  value={nameRu}
                  onChange={(e) => setNameRu(e.target.value)}
                />
              </div>
            </div>

            {/* Dish / sub-recipe segmented toggle */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center rounded-lg border border-border bg-secondary p-1">
                <button
                  type="button"
                  onClick={() => setIsSubRecipe(false)}
                  className={
                    'h-8 rounded-md px-3 text-sm font-medium transition-colors ' +
                    (!isSubRecipe
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground')
                  }
                >
                  {t('recipes.filter_dishes')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSubRecipe(true)}
                  className={
                    'h-8 rounded-md px-3 text-sm font-medium transition-colors ' +
                    (isSubRecipe
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground')
                  }
                >
                  {t('recipes.is_sub_recipe')}
                </button>
              </div>
              {/* Hidden switch kept for a11y / form parity. */}
              <Switch
                id="is_sub_recipe"
                checked={isSubRecipe}
                onCheckedChange={setIsSubRecipe}
                className="sr-only"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="serving_size">
                    {t('recipes.serving_size')}
                  </Label>
                  <FieldHint text={t('recipes.serving_size_hint')} />
                </div>
                <Input
                  id="serving_size"
                  type="number"
                  step="0.001"
                  min="0"
                  value={servingSize}
                  onChange={(e) => setServingSize(e.target.value)}
                  placeholder={t('recipes.serving_size_ph')}
                  className="font-mono tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="serving_unit">
                    {t('recipes.serving_unit')}
                  </Label>
                  <FieldHint text={t('recipes.serving_unit_hint')} />
                </div>
                <Input
                  id="serving_unit"
                  value={servingUnit}
                  onChange={(e) => setServingUnit(e.target.value)}
                  placeholder={t('recipes.serving_unit_ph')}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 stokly-card p-5">
            <h2 className="text-sm font-semibold">
              {t('recipes.line_ingredient')}
            </h2>
            <RecipeIngredientsEditor
              lines={lines}
              ingredientOptions={ingredientOptions}
              subRecipeOptions={subRecipeOptions}
              onChange={patchLine}
              onRemove={removeLine}
              onAddIngredient={addIngredient}
              onAddSubRecipe={addSubRecipe}
            />
          </div>

          <div className="space-y-2 stokly-card p-5">
            <Label htmlFor="notes">{t('inventory.notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Sticky summary + actions */}
        <div className="space-y-3">
          <RecipeCostSummary
            totalCost={totalCost}
            servingSize={parsedServing}
            salePrice={salePrice}
            onSalePriceChange={setSalePrice}
            disabled={isSubRecipe}
          />
          {state.error && (
            <p className="text-sm text-destructive">{t('common.error')}</p>
          )}
          <SubmitButton
            pendingText={t('common.saving')}
            className="w-full"
          >
            {t('common.save')}
          </SubmitButton>
          <Button
            asChild
            variant="secondary"
            type="button"
            className="w-full"
          >
            <Link href="/app/recipes">{t('common.cancel')}</Link>
          </Button>
        </div>
      </div>
    </form>
  )
}
