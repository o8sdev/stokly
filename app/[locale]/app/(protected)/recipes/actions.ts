'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireTenant, canWrite } from '@/lib/auth/tenant'
import { recipeSchema } from '@/lib/validations/recipe'
import { tenantHasFeature } from '@/lib/admin/entitlements'
import { getIngredients } from '@/lib/data/queries'
import { isConvertible } from '@/lib/constants/units'

export interface RecipeActionResult {
  error?: string
  success?: boolean
}

// The client serialises the full recipe (header + lines) into a single hidden
// JSON field so we can validate the whole structure server-side in one go.
function parseRecipePayload(formData: FormData) {
  const raw = String(formData.get('payload') ?? '')
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  return recipeSchema.safeParse(json)
}

function toNumberOrNull(value: number | '' | undefined): number | null {
  return value === '' || value === undefined ? null : value
}

// Resolve a recipe's consumption-location routing: keep it only when the tenant
// has multi_location AND the target is one of its consumption points; else null
// (→ the RPC falls back to the default consumption point).
async function resolveConsumptionLocation(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  raw: string | undefined
): Promise<string | null> {
  if (!raw) return null
  if (!(await tenantHasFeature(tenantId, 'multi_location'))) return null
  const { data } = await supabase
    .from('storage_locations')
    .select('id')
    .eq('id', raw)
    .eq('tenant_id', tenantId)
    .eq('is_consumption_point', true)
    .maybeSingle()
  return data?.id ?? null
}

// Keep a recipe's category only when it actually belongs to the tenant.
async function resolveCategory(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  raw: string | undefined
): Promise<string | null> {
  if (!raw) return null
  const { data } = await supabase
    .from('recipe_categories')
    .select('id')
    .eq('id', raw)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return data?.id ?? null
}

// Stocked preps (Yarımfabrikat) are backed by a produced ingredient that holds
// their stock — the schema keys inventory on ingredient_id. Find-or-create it and
// return its id; return null for dishes / made-to-order preps (which explode to
// raw at sale). Unlinking keeps the ingredient (its stock + history stay valid).
async function resolveBackingPrep(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  opts: {
    isSubRecipe: boolean
    isStocked: boolean
    name: string
    servingUnit: string
    existingProducedId: string | null
  }
): Promise<string | null> {
  if (!opts.isSubRecipe || !opts.isStocked) return null

  const unit = opts.servingUnit || 'porsiya'
  if (opts.existingProducedId) {
    await supabase
      .from('ingredients')
      .update({ name: opts.name, unit })
      .eq('id', opts.existingProducedId)
      .eq('tenant_id', tenantId)
    return opts.existingProducedId
  }
  const { data: ing } = await supabase
    .from('ingredients')
    .insert({
      tenant_id: tenantId,
      name: opts.name,
      unit,
      cost_per_unit: 0,
      yield_percent: 1,
      is_produced: true,
    })
    .select('id')
    .single()
  return ing?.id ?? null
}

// B4 fail-loud: every ingredient line's unit must have a path to the
// ingredient's base unit (same unit, metric family, or a defined per-ingredient
// conversion) — no more silent same-unit assumption.
async function recipeUnitsConvertible(
  tenantId: string,
  lines: { kind: string; sourceId: string; unit: string }[]
): Promise<boolean> {
  const ingLines = lines.filter((l) => l.kind === 'ingredient')
  if (ingLines.length === 0) return true
  const ingredients = await getIngredients(tenantId)
  const byId = new Map(ingredients.map((i) => [i.id, i]))
  return ingLines.every((l) => {
    const ing = byId.get(l.sourceId)
    if (!ing) return true // unknown ingredient is caught by the FK insert
    return isConvertible(l.unit, ing.unit, ing.unit_conversions)
  })
}

async function persistLines(
  recipeId: string,
  lines: { kind: string; sourceId: string; quantity: number; unit: string; yieldOverride?: number | '' }[]
) {
  const supabase = createClient()
  // Replace the full set of lines on every save (append-only rule applies to
  // stock_movements only — recipe_ingredients are mutable composition rows).
  await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)

  if (lines.length === 0) return

  await supabase.from('recipe_ingredients').insert(
    lines.map((line) => ({
      recipe_id: recipeId,
      ingredient_id: line.kind === 'ingredient' ? line.sourceId : null,
      sub_recipe_id: line.kind === 'sub_recipe' ? line.sourceId : null,
      quantity: line.quantity,
      unit: line.unit,
      yield_override:
        line.yieldOverride === '' || line.yieldOverride === undefined
          ? null
          : Number(line.yieldOverride) / 100,
    }))
  )
}

export async function createRecipe(
  locale: string,
  _prev: RecipeActionResult,
  formData: FormData
): Promise<RecipeActionResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  const parsed = parseRecipePayload(formData)
  if (!parsed || !parsed.success) return { error: 'validation' }
  const data = parsed.data

  if (!(await recipeUnitsConvertible(ctx.tenantId, data.lines))) {
    return { error: 'unit' }
  }

  const supabase = createClient()
  const consumptionLocationId = await resolveConsumptionLocation(
    supabase,
    ctx.tenantId,
    data.consumption_location_id
  )
  const categoryId = await resolveCategory(
    supabase,
    ctx.tenantId,
    data.category_id
  )
  const producedIngredientId = await resolveBackingPrep(supabase, ctx.tenantId, {
    isSubRecipe: data.is_sub_recipe,
    isStocked: data.is_stocked === true,
    name: data.name,
    servingUnit: data.serving_unit || '',
    existingProducedId: null,
  })
  const { data: recipe, error } = await supabase
    .from('recipes')
    .insert({
      tenant_id: ctx.tenantId,
      name: data.name,
      name_az: data.name_az || null,
      name_ru: data.name_ru || null,
      is_sub_recipe: data.is_sub_recipe,
      serving_size: toNumberOrNull(data.serving_size),
      serving_unit: data.serving_unit || null,
      sale_price: toNumberOrNull(data.sale_price),
      yield_percent:
        data.yield_percent === '' || data.yield_percent === undefined
          ? 1
          : Number(data.yield_percent) / 100,
      consumption_location_id: consumptionLocationId,
      category_id: categoryId,
      produced_ingredient_id: producedIngredientId,
      notes: data.notes || null,
    })
    .select('id')
    .single()

  if (error || !recipe) return { error: 'generic' }

  await persistLines(recipe.id, data.lines)

  revalidatePath(`/${locale}/app/recipes`)
  // First recipe satisfies an onboarding step — invalidate the dashboard so the
  // Getting-Started card recomputes and disappears on next visit.
  revalidatePath(`/${locale}/app/dashboard`)
  redirect(`/${locale}/app/recipes`)
}

export async function updateRecipe(
  locale: string,
  id: string,
  _prev: RecipeActionResult,
  formData: FormData
): Promise<RecipeActionResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  const parsed = parseRecipePayload(formData)
  if (!parsed || !parsed.success) return { error: 'validation' }
  const data = parsed.data

  if (!(await recipeUnitsConvertible(ctx.tenantId, data.lines))) {
    return { error: 'unit' }
  }

  const supabase = createClient()
  const consumptionLocationId = await resolveConsumptionLocation(
    supabase,
    ctx.tenantId,
    data.consumption_location_id
  )
  const categoryId = await resolveCategory(
    supabase,
    ctx.tenantId,
    data.category_id
  )
  const { data: existingRecipe } = await supabase
    .from('recipes')
    .select('produced_ingredient_id')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()
  const producedIngredientId = await resolveBackingPrep(supabase, ctx.tenantId, {
    isSubRecipe: data.is_sub_recipe,
    isStocked: data.is_stocked === true,
    name: data.name,
    servingUnit: data.serving_unit || '',
    existingProducedId: existingRecipe?.produced_ingredient_id ?? null,
  })
  const { error } = await supabase
    .from('recipes')
    .update({
      name: data.name,
      name_az: data.name_az || null,
      name_ru: data.name_ru || null,
      is_sub_recipe: data.is_sub_recipe,
      serving_size: toNumberOrNull(data.serving_size),
      serving_unit: data.serving_unit || null,
      sale_price: toNumberOrNull(data.sale_price),
      yield_percent:
        data.yield_percent === '' || data.yield_percent === undefined
          ? 1
          : Number(data.yield_percent) / 100,
      consumption_location_id: consumptionLocationId,
      category_id: categoryId,
      produced_ingredient_id: producedIngredientId,
      notes: data.notes || null,
    })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return { error: 'generic' }

  await persistLines(id, data.lines)

  revalidatePath(`/${locale}/app/recipes`)
  redirect(`/${locale}/app/recipes`)
}

// ── Menu categories (sections: breakfast, soups, …) ─────────────────────────
export async function createRecipeCategory(
  locale: string,
  _prev: RecipeActionResult,
  formData: FormData
): Promise<RecipeActionResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }
  const name = String(formData.get('name') ?? '').trim()
  if (!name || name.length > 100) return { error: 'validation' }

  const supabase = createClient()
  const { error } = await supabase.from('recipe_categories').insert({
    tenant_id: ctx.tenantId,
    name,
  })
  if (error) return { error: 'generic' } // incl. duplicate name per tenant
  revalidatePath(`/${locale}/app/recipes`)
  return { success: true }
}

// Recipes in a deleted category fall back to "uncategorised" (FK SET NULL).
export async function deleteRecipeCategory(
  locale: string,
  categoryId: string
): Promise<void> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return
  const supabase = createClient()
  await supabase
    .from('recipe_categories')
    .delete()
    .eq('id', categoryId)
    .eq('tenant_id', ctx.tenantId)
  revalidatePath(`/${locale}/app/recipes`)
}
