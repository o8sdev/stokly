'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireTenant, canWrite } from '@/lib/auth/tenant'
import type { Json } from '@/types/database'

export interface ProductionResult {
  error?: string
  success?: boolean
}

const runSchema = z.object({
  output_ingredient_id: z.string().uuid(),
  output_quantity: z.coerce.number().positive(),
  expiry_date: z.string().optional().or(z.literal('')),
  recipe_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  inputs: z
    .array(
      z.object({
        ingredient_id: z.string().uuid(),
        quantity: z.coerce.number().positive(),
      })
    )
    .min(1, 'min_one_input'),
})

// Execute a production run: FIFO-consume the raw inputs from the kitchen, create
// the produced batch (cost rolled up), all atomically in the DB function.
export async function executeProductionRun(
  locale: string,
  _prev: ProductionResult,
  formData: FormData
): Promise<ProductionResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  let raw: unknown
  try {
    raw = JSON.parse(String(formData.get('payload') ?? ''))
  } catch {
    return { error: 'validation' }
  }
  const parsed = runSchema.safeParse(raw)
  if (!parsed.success) return { error: 'validation' }
  const d = parsed.data

  const supabase = createClient()
  const { error } = await supabase.rpc('execute_production_run', {
    p_output_ingredient_id: d.output_ingredient_id,
    p_output_quantity: d.output_quantity,
    p_expiry: d.expiry_date || null,
    p_recipe_id: d.recipe_id || null,
    p_notes: d.notes || null,
    p_inputs: d.inputs as unknown as Json,
  })
  if (error) {
    if (error.message?.includes('kitchen_short')) return { error: 'kitchen_short' }
    return { error: 'generic' }
  }

  revalidatePath(`/${locale}/app/production`)
  revalidatePath(`/${locale}/app/inventory`)
  revalidatePath(`/${locale}/app/dashboard`)
  redirect(`/${locale}/app/production`)
}

// Undo an intact run (restores raw, removes the produced batch). Refused if the
// produced stock was already consumed/moved.
export async function voidProductionRun(
  locale: string,
  runId: string
): Promise<ProductionResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  const supabase = createClient()
  const { error } = await supabase.rpc('void_production_run', {
    p_run_id: runId,
  })
  if (error) {
    if (error.message?.includes('already_voided')) {
      return { error: 'already_voided' }
    }
    if (error.message?.includes('output_already_used')) {
      return { error: 'output_used' }
    }
    return { error: 'generic' }
  }

  revalidatePath(`/${locale}/app/production`)
  revalidatePath(`/${locale}/app/inventory`)
  revalidatePath(`/${locale}/app/dashboard`)
  return { success: true }
}
