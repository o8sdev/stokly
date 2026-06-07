'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireTenant, canWrite } from '@/lib/auth/tenant'
import { recipeSchema } from '@/lib/validations/recipe'

export interface RecipeActionResult {
  error?: string
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

  const supabase = createClient()
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
      notes: data.notes || null,
    })
    .select('id')
    .single()

  if (error || !recipe) return { error: 'generic' }

  await persistLines(recipe.id, data.lines)

  revalidatePath(`/${locale}/recipes`)
  redirect(`/${locale}/recipes`)
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

  const supabase = createClient()
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
      notes: data.notes || null,
    })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return { error: 'generic' }

  await persistLines(id, data.lines)

  revalidatePath(`/${locale}/recipes`)
  redirect(`/${locale}/recipes`)
}
