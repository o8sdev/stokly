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
import { toBaseUnit } from '@/lib/constants/units'
import { RecipeIngredientsEditor } from './recipe-ingredients-editor'
import { RecipeCostSummary } from './recipe-cost-summary'

// Serving-unit choices: the name of one portion. Covers plated dishes
// (portion / piece / slice) and bulk sub-recipes (weight / volume). The stored
// value is label-only and doesn't affect any calculation.
const SERVING_UNIT_OPTIONS = [
  { value: 'porsiya', key: 'portion' },
  { value: 'ədəd', key: 'piece' },
  { value: 'dilim', key: 'slice' },
  { value: 'kq', key: 'kg' },
  { value: 'q', key: 'gram' },
  { value: 'l', key: 'liter' },
  { value: 'ml', key: 'ml' },
] as const

let keyCounter = 0
function nextKey(): string {
  keyCounter += 1
  return `line-${keyCounter}`
}

export function RecipeForm({
  locale,
  ingredientOptions,
  subRecipeOptions,
  consumptionLocations,
  defaultConsumptionId,
  multiLocation,
  categories = [],
  recipe,
  existingLines,
}: {
  locale: string
  ingredientOptions: IngredientOption[]
  subRecipeOptions: SubRecipeOption[]
  consumptionLocations: { id: string; name: string }[]
  defaultConsumptionId: string | null
  multiLocation: boolean
  categories?: { id: string; name: string }[]
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
  // Sub-recipe yield as a 0–100 percentage (stored as a 0–1 fraction).
  const [yieldPercent, setYieldPercent] = useState(
    recipe?.yield_percent != null
      ? String(Math.round(recipe.yield_percent * 1000) / 10)
      : ''
  )
  // Which consumption point this dish draws from ('' = tenant default).
  const [consumptionLocationId, setConsumptionLocationId] = useState(
    recipe?.consumption_location_id ?? ''
  )
  // Menu section ('' = uncategorised).
  const [categoryId, setCategoryId] = useState(recipe?.category_id ?? '')
  // Prep tracked as stock (produced) vs made-to-order. Default ON for a new
  // prep; an existing prep is stocked iff it already backs a produced ingredient.
  const [isStocked, setIsStocked] = useState(
    recipe ? recipe.produced_ingredient_id != null : true
  )

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
  // Mirrors the server-side calc: the line quantity is converted to the
  // ingredient's base unit (metric families + per-ingredient factors) BEFORE
  // costing, so a 100 q line on a 5 AZN/kq ingredient costs 0.50, not 500.
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
        // An unpicked unit means "the ingredient's own unit".
        const baseQty = toBaseUnit(
          qty,
          line.unit || opt.unit,
          opt.unit,
          opt.unit_conversions
        )
        return sum + ingredientLineCost(baseQty, opt.cost_per_unit, yieldPercent)
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
        yield_percent: yieldPercent === '' ? '' : Number(yieldPercent),
        consumption_location_id: consumptionLocationId,
        category_id: categoryId,
        is_stocked: isSubRecipe ? isStocked : false,
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
      yieldPercent,
      consumptionLocationId,
      categoryId,
      isStocked,
      notes,
      lines,
    ]
  )

  const parsedServing = servingSize === '' ? null : Number(servingSize)

  // Preserve a free-text serving unit saved before this became a dropdown.
  const knownServingUnits: string[] = SERVING_UNIT_OPTIONS.map((o) => o.value)
  const legacyServingUnit =
    recipe?.serving_unit && !knownServingUnits.includes(recipe.serving_unit)
      ? recipe.serving_unit
      : null

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
              <FieldHint text={t('recipes.kind_hint')} />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('recipes.kind_example')}
            </p>

            {/* Menu section (dishes only) — drives list/report filtering. */}
            {!isSubRecipe && categories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="category_id">{t('recipes.category')}</Label>
                <select
                  id="category_id"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-[38px] w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:max-w-[16rem]"
                >
                  <option value="">{t('recipes.no_category')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                <select
                  id="serving_unit"
                  value={servingUnit}
                  onChange={(e) => setServingUnit(e.target.value)}
                  className="flex h-[38px] w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                >
                  <option value="">{t('recipes.serving_unit_ph')}</option>
                  {legacyServingUnit && (
                    <option value={legacyServingUnit}>
                      {legacyServingUnit}
                    </option>
                  )}
                  {SERVING_UNIT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(`recipes.serving_units.${o.key}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isSubRecipe && (
              <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="is_stocked">{t('recipes.stocked')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {isStocked
                        ? t('recipes.stocked_help')
                        : t('recipes.made_to_order_help')}
                    </p>
                  </div>
                  <Switch
                    id="is_stocked"
                    checked={isStocked}
                    onCheckedChange={setIsStocked}
                  />
                </div>
              </div>
            )}

            {isSubRecipe && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="yield_percent">{t('recipes.yield')}</Label>
                  <FieldHint text={t('recipes.yield_hint')} />
                </div>
                <Input
                  id="yield_percent"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={yieldPercent}
                  onChange={(e) => setYieldPercent(e.target.value)}
                  placeholder="100"
                  className="font-mono tabular-nums sm:max-w-[12rem]"
                />
              </div>
            )}

            {!isSubRecipe &&
              multiLocation &&
              consumptionLocations.length > 1 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="consumption_location_id">
                      {t('recipes.consumption_location')}
                    </Label>
                    <FieldHint text={t('recipes.consumption_location_hint')} />
                  </div>
                  <select
                    id="consumption_location_id"
                    value={consumptionLocationId}
                    onChange={(e) => setConsumptionLocationId(e.target.value)}
                    className="flex h-[38px] w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:max-w-xs"
                  >
                    <option value="">
                      {t('recipes.consumption_default')}
                    </option>
                    {consumptionLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
          {/* Preps may carry a sale price too — a priced Yarımfabrikat (e.g. a
              portion of nuggets) becomes sellable directly from the sales page,
              deducting its own produced stock. */}
          <RecipeCostSummary
            totalCost={totalCost}
            servingSize={parsedServing}
            salePrice={salePrice}
            onSalePriceChange={setSalePrice}
          />
          {state.error && (
            <p className="text-sm text-destructive">
              {state.error === 'unit'
                ? t('recipes.unit_error')
                : state.error === 'in_use'
                  ? t('recipes.in_use_error')
                  : t('common.error')}
            </p>
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
