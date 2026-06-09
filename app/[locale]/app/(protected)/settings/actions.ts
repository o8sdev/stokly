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

// Explicitly hide the first-run onboarding card. Completion is otherwise derived
// from real data, which can trap a business that doesn't use every step (e.g.
// inventory-only, no recipes). Used as a <form> action — the bound formData arg
// is unused.
export async function dismissOnboarding(
  locale: string,
  _formData?: FormData
): Promise<SettingsResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  const supabase = createClient()
  const { error } = await supabase
    .from('tenants')
    .update({ onboarding_dismissed_at: new Date().toISOString() })
    .eq('id', ctx.tenantId)
  if (error) return { error: 'generic' }

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

// ── Storage locations (Warehouse, Kitchen, …) ──────────────────────────────
const LOC_PATH = (locale: string) => `/${locale}/app/settings/locations`

const locationSchema = z.object({
  name: z.string().min(1).max(80),
})

export async function createLocation(
  locale: string,
  _prev: SettingsResult,
  formData: FormData
): Promise<SettingsResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }
  const parsed = locationSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) return { error: 'validation' }

  const supabase = createClient()
  // Append to the end of the list.
  const { data: last } = await supabase
    .from('storage_locations')
    .select('sort_order')
    .eq('tenant_id', ctx.tenantId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { error } = await supabase.from('storage_locations').insert({
    tenant_id: ctx.tenantId,
    name: parsed.data.name,
    is_frozen: formData.get('is_frozen') === 'on',
    sort_order: (last?.sort_order ?? 0) + 1,
  })
  if (error) return { error: 'generic' }
  revalidatePath(LOC_PATH(locale))
  return { success: true }
}

export async function renameLocation(
  locale: string,
  id: string,
  formData: FormData
): Promise<void> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  const supabase = createClient()
  await supabase
    .from('storage_locations')
    .update({ name: name.slice(0, 80) })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
  revalidatePath(LOC_PATH(locale))
}

// Delete a location — refused if it is the kitchen / default-receiving point or
// still holds active stock (guarded in the UI too, this is the hard backstop).
export async function deleteLocation(
  locale: string,
  id: string
): Promise<void> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return
  const supabase = createClient()
  const { data: loc } = await supabase
    .from('storage_locations')
    .select('is_kitchen, is_default_receiving')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()
  if (!loc || loc.is_kitchen || loc.is_default_receiving) return
  const { count } = await supabase
    .from('ingredient_batches')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId)
    .eq('location_id', id)
    .eq('status', 'active')
    .gt('quantity_remaining', 0)
  if ((count ?? 0) > 0) return
  await supabase
    .from('storage_locations')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
  revalidatePath(LOC_PATH(locale))
}

// Promote a location to THE kitchen (consumption point) — only one per tenant,
// so clear the flag elsewhere first.
export async function setKitchenLocation(
  locale: string,
  id: string
): Promise<void> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return
  const supabase = createClient()
  await supabase
    .from('storage_locations')
    .update({ is_kitchen: false })
    .eq('tenant_id', ctx.tenantId)
    .neq('id', id)
  await supabase
    .from('storage_locations')
    .update({ is_kitchen: true })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
  revalidatePath(LOC_PATH(locale))
}

// Promote a location to THE default receiving dock — only one per tenant.
export async function setDefaultReceivingLocation(
  locale: string,
  id: string
): Promise<void> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return
  const supabase = createClient()
  await supabase
    .from('storage_locations')
    .update({ is_default_receiving: false })
    .eq('tenant_id', ctx.tenantId)
    .neq('id', id)
  await supabase
    .from('storage_locations')
    .update({ is_default_receiving: true })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
  revalidatePath(LOC_PATH(locale))
}

export async function setLocationFrozen(
  locale: string,
  id: string,
  value: boolean
): Promise<void> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return
  const supabase = createClient()
  await supabase
    .from('storage_locations')
    .update({ is_frozen: value })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
  revalidatePath(LOC_PATH(locale))
}
