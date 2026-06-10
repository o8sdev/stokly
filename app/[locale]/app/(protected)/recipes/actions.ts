'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireTenant, canWrite } from '@/lib/auth/tenant'
import { recipeSchema } from '@/lib/validations/recipe'
import { tenantHasFeature } from '@/lib/admin/entitlements'

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
  const consumptionLocationId = await resolveConsumptionLocation(
    supabase,
    ctx.tenantId,
    data.consumption_location_id
  )
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

  const supabase = createClient()
  const consumptionLocationId = await resolveConsumptionLocation(
    supabase,
    ctx.tenantId,
    data.consumption_location_id
  )
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
      notes: data.notes || null,
    })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return { error: 'generic' }

  await persistLines(id, data.lines)

  revalidatePath(`/${locale}/app/recipes`)
  redirect(`/${locale}/app/recipes`)
}
