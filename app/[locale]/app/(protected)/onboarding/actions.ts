'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireTenant, canWrite } from '@/lib/auth/tenant'

export interface OnboardingResult {
  error?: string
  success?: boolean
}

// A focused, inline ingredient add for the onboarding wizard — name + unit +
// cost (+ optional default supplier / par level). Returns a result instead of
// redirecting (the wizard stays put and refreshes its list); the full ingredient
// form keeps the advanced fields (conversions, produced, shelf life).
const quickIngredientSchema = z.object({
  name: z.string().min(1).max(200),
  unit: z.string().min(1).max(50),
  cost_per_unit: z.coerce.number().nonnegative(),
  supplier_id: z.string().uuid().optional().or(z.literal('')),
  par_level: z
    .union([z.coerce.number().nonnegative(), z.literal('')])
    .optional(),
})

export async function addIngredientQuick(
  locale: string,
  _prev: OnboardingResult,
  formData: FormData
): Promise<OnboardingResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  const parsed = quickIngredientSchema.safeParse({
    name: formData.get('name'),
    unit: formData.get('unit'),
    cost_per_unit: formData.get('cost_per_unit'),
    supplier_id: formData.get('supplier_id') || '',
    par_level: formData.get('par_level') || '',
  })
  if (!parsed.success) return { error: 'validation' }

  const supabase = createClient()
  const { error } = await supabase.from('ingredients').insert({
    tenant_id: ctx.tenantId,
    name: parsed.data.name,
    unit: parsed.data.unit,
    cost_per_unit: parsed.data.cost_per_unit,
    yield_percent: 1,
    supplier_id: parsed.data.supplier_id || null,
    par_level:
      parsed.data.par_level === '' || parsed.data.par_level == null
        ? null
        : Number(parsed.data.par_level),
  })
  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/app/onboarding`)
  revalidatePath(`/${locale}/app/ingredients`)
  revalidatePath(`/${locale}/app/dashboard`)
  return { success: true }
}
