'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireTenant, canWrite } from '@/lib/auth/tenant'
import { ingredientSchema } from '@/lib/validations/ingredient'

export interface ActionResult {
  error?: string
  ok?: boolean
}

// Parse the raw form payload into the storage shape (yield as 0–1 fraction).
function parsePayload(formData: FormData) {
  const yieldDisplay = Number(formData.get('yield_percent_display') ?? 0)
  const supplierRaw = String(formData.get('supplier_id') ?? '')
  const thresholdRaw = String(formData.get('low_stock_threshold') ?? '')
  const parRaw = String(formData.get('par_level') ?? '')
  const isProduced = formData.get('is_produced') === 'on'
  const shelfRaw = String(formData.get('default_shelf_life_days') ?? '')
  const storageRaw = String(formData.get('storage_location') ?? '')

  return ingredientSchema.safeParse({
    name: formData.get('name'),
    name_az: formData.get('name_az') || undefined,
    name_ru: formData.get('name_ru') || undefined,
    unit: formData.get('unit'),
    cost_per_unit: formData.get('cost_per_unit'),
    yield_percent: yieldDisplay / 100,
    supplier_id: supplierRaw ? supplierRaw : null,
    low_stock_threshold: thresholdRaw === '' ? null : Number(thresholdRaw),
    par_level: parRaw === '' ? null : Number(parRaw),
    is_produced: isProduced,
    default_shelf_life_days:
      isProduced && shelfRaw !== '' ? Number(shelfRaw) : null,
    storage_location: isProduced && storageRaw ? storageRaw : null,
  })
}

export async function createIngredient(
  locale: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  const parsed = parsePayload(formData)
  if (!parsed.success) return { error: 'validation' }

  const supabase = createClient()
  const { error } = await supabase.from('ingredients').insert({
    tenant_id: ctx.tenantId,
    name: parsed.data.name,
    name_az: parsed.data.name_az || null,
    name_ru: parsed.data.name_ru || null,
    unit: parsed.data.unit,
    cost_per_unit: parsed.data.cost_per_unit,
    yield_percent: parsed.data.yield_percent,
    supplier_id: parsed.data.supplier_id ?? null,
    low_stock_threshold: parsed.data.low_stock_threshold ?? null,
    is_produced: parsed.data.is_produced,
    default_shelf_life_days: parsed.data.default_shelf_life_days ?? null,
    storage_location: parsed.data.storage_location ?? null,
  })

  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/app/ingredients`)
  // First ingredient satisfies an onboarding step — invalidate the dashboard so
  // the Getting-Started card recomputes and disappears on next visit.
  revalidatePath(`/${locale}/app/dashboard`)
  redirect(`/${locale}/app/ingredients`)
}

// ── Per-ingredient unit conversions (B4) ───────────────────────────────────
// Define how a pack/alt unit converts to the ingredient's base unit, e.g.
// "1 şüşə = 750 ml". Consumed by the cost/usage calc and recipe-line validation.
export async function setIngredientConversion(
  locale: string,
  ingredientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }
  const unit = String(formData.get('unit') ?? '').trim()
  const factor = Number(formData.get('factor') ?? NaN)
  if (!unit || !Number.isFinite(factor) || factor <= 0) {
    return { error: 'validation' }
  }

  const supabase = createClient()
  const { data: ing } = await supabase
    .from('ingredients')
    .select('unit')
    .eq('id', ingredientId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()
  if (!ing) return { error: 'validation' }
  if (ing.unit === unit) return { error: 'same_unit' }

  const { error } = await supabase
    .from('ingredient_unit_conversions')
    .upsert(
      {
        tenant_id: ctx.tenantId,
        ingredient_id: ingredientId,
        unit,
        factor_to_base: factor,
      },
      { onConflict: 'ingredient_id,unit' }
    )
  if (error) return { error: 'generic' }
  revalidatePath(`/${locale}/app/ingredients/${ingredientId}`)
  return { ok: true }
}

export async function removeIngredientConversion(
  locale: string,
  ingredientId: string,
  unit: string
): Promise<void> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return
  const supabase = createClient()
  await supabase
    .from('ingredient_unit_conversions')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('ingredient_id', ingredientId)
    .eq('unit', unit)
  revalidatePath(`/${locale}/app/ingredients/${ingredientId}`)
}

// Best-effort delete. The stock_movements FK is ON DELETE RESTRICT, so an
// ingredient with recorded movements cannot be removed — the DB rejects it and
// we simply revalidate without surfacing an error (the row stays).
export async function deleteIngredient(
  locale: string,
  id: string
): Promise<void> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return
  const supabase = createClient()
  await supabase
    .from('ingredients')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
  revalidatePath(`/${locale}/app/ingredients`)
}

export async function updateIngredient(
  locale: string,
  id: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  const parsed = parsePayload(formData)
  if (!parsed.success) return { error: 'validation' }

  const supabase = createClient()
  const { error } = await supabase
    .from('ingredients')
    .update({
      name: parsed.data.name,
      name_az: parsed.data.name_az || null,
      name_ru: parsed.data.name_ru || null,
      unit: parsed.data.unit,
      cost_per_unit: parsed.data.cost_per_unit,
      yield_percent: parsed.data.yield_percent,
      supplier_id: parsed.data.supplier_id ?? null,
      low_stock_threshold: parsed.data.low_stock_threshold ?? null,
      par_level: parsed.data.par_level ?? null,
      is_produced: parsed.data.is_produced,
      default_shelf_life_days: parsed.data.default_shelf_life_days ?? null,
      storage_location: parsed.data.storage_location ?? null,
    })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/app/ingredients`)
  redirect(`/${locale}/app/ingredients`)
}
