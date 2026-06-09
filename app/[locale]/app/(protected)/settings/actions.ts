'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireTenant, canWrite } from '@/lib/auth/tenant'
import { BUSINESS_TYPE_KEYS } from '@/lib/constants/business-types'

export interface SettingsResult {
  error?: string
  success?: boolean
}

const tenantSchema = z.object({
  name: z.string().min(1).max(200),
  currency: z.string().min(1).max(10),
  locale: z.enum(['az', 'ru']),
  count_cycle_days: z.coerce.number().int().min(1).max(365),
  business_type: z.string().optional(),
})

export async function updateTenant(
  locale: string,
  _prev: SettingsResult,
  formData: FormData
): Promise<SettingsResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  const parsed = tenantSchema.safeParse({
    name: formData.get('name'),
    currency: formData.get('currency'),
    locale: formData.get('locale'),
    count_cycle_days: formData.get('count_cycle_days'),
    business_type: formData.get('business_type'),
  })
  if (!parsed.success) return { error: 'validation' }

  const bt = parsed.data.business_type
  const supabase = createClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      name: parsed.data.name,
      currency: parsed.data.currency,
      locale: parsed.data.locale,
      count_cycle_days: parsed.data.count_cycle_days,
      business_type: bt && BUSINESS_TYPE_KEYS.includes(bt) ? bt : null,
    })
    .eq('id', ctx.tenantId)

  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/app/settings`)
  revalidatePath(`/${locale}/app/dashboard`)
  return { success: true }
}

// Set the tenant's business type from the first-run onboarding (one click).
export async function setBusinessType(
  locale: string,
  type: string
): Promise<SettingsResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }
  if (!BUSINESS_TYPE_KEYS.includes(type)) return { error: 'validation' }

  const supabase = createClient()
  const { error } = await supabase
    .from('tenants')
    .update({ business_type: type })
    .eq('id', ctx.tenantId)
  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/app/dashboard`)
  revalidatePath(`/${locale}/app/settings`)
  return { success: true }
}

const supplierSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(50).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

export async function createSupplier(
  locale: string,
  _prev: SettingsResult,
  formData: FormData
): Promise<SettingsResult> {
  const ctx = await requireTenant(locale)

  const parsed = supplierSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone') || undefined,
    notes: formData.get('notes') || undefined,
  })
  if (!parsed.success) return { error: 'validation' }

  const supabase = createClient()
  const { error } = await supabase.from('suppliers').insert({
    tenant_id: ctx.tenantId,
    name: parsed.data.name,
    phone: parsed.data.phone || null,
    notes: parsed.data.notes || null,
  })

  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/app/settings/suppliers`)
  return { success: true }
}

export async function deleteSupplier(
  locale: string,
  supplierId: string
): Promise<void> {
  const ctx = await requireTenant(locale)
  const supabase = createClient()
  await supabase
    .from('suppliers')
    .delete()
    .eq('id', supplierId)
    .eq('tenant_id', ctx.tenantId)
  revalidatePath(`/${locale}/app/settings/suppliers`)
}
