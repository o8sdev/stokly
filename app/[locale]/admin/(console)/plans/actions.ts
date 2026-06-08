'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { logAdminAction } from '@/lib/admin/audit'

export interface PlanResult {
  ok?: boolean
  error?: string
}

async function ensureSuper(locale: string): Promise<string | null> {
  const ctx = await requirePlatformAdmin(locale)
  return ctx.role === 'super' ? ctx.userId : null
}

export async function updatePlan(
  locale: string,
  _prev: PlanResult,
  formData: FormData
): Promise<PlanResult> {
  const userId = await ensureSuper(locale)
  if (!userId) return { error: 'forbidden' }

  const key = String(formData.get('key') ?? '')
  const name_az = String(formData.get('name_az') ?? '').trim()
  const name_ru = String(formData.get('name_ru') ?? '').trim()
  const monthly_price = Number(formData.get('monthly_price') ?? NaN)
  const description_az = String(formData.get('description_az') ?? '').trim() || null
  const description_ru = String(formData.get('description_ru') ?? '').trim() || null

  if (!key || !name_az || !name_ru) return { error: 'validation' }
  if (!Number.isFinite(monthly_price) || monthly_price < 0) {
    return { error: 'validation' }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('plans')
    .update({
      name_az,
      name_ru,
      monthly_price,
      description_az,
      description_ru,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('key', key)
  if (error) return { error: 'generic' }

  await logAdminAction('plan_edited', { details: { key, monthly_price } })
  revalidatePath(`/${locale}/admin/plans`)
  return { ok: true }
}

export async function setPlanActive(
  locale: string,
  key: string,
  active: boolean
): Promise<void> {
  const userId = await ensureSuper(locale)
  if (!userId) return
  const supabase = createClient()
  await supabase
    .from('plans')
    .update({ is_active: active, updated_at: new Date().toISOString(), updated_by: userId })
    .eq('key', key)
  await logAdminAction('plan_edited', { details: { key, is_active: active } })
  revalidatePath(`/${locale}/admin/plans`)
}

export async function togglePlanFeature(
  locale: string,
  planKey: string,
  featureKey: string,
  included: boolean
): Promise<void> {
  const userId = await ensureSuper(locale)
  if (!userId) return
  const supabase = createClient()
  await supabase
    .from('plan_features')
    .upsert(
      { plan_key: planKey, feature_key: featureKey, included },
      { onConflict: 'plan_key,feature_key' }
    )
  await logAdminAction('plan_edited', {
    details: { plan: planKey, feature: featureKey, included },
  })
  revalidatePath(`/${locale}/admin/plans`)
}

export async function createPlan(
  locale: string,
  _prev: PlanResult,
  formData: FormData
): Promise<PlanResult> {
  const userId = await ensureSuper(locale)
  if (!userId) return { error: 'forbidden' }

  const rawKey = String(formData.get('key') ?? '').trim().toLowerCase()
  const key = rawKey.replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
  const name_az = String(formData.get('name_az') ?? '').trim()
  const name_ru = String(formData.get('name_ru') ?? '').trim()
  const monthly_price = Number(formData.get('monthly_price') ?? 0)
  const sort_order = Number(formData.get('sort_order') ?? 0)

  if (!key || !name_az || !name_ru) return { error: 'validation' }
  if (!Number.isFinite(monthly_price) || monthly_price < 0) {
    return { error: 'validation' }
  }

  const supabase = createClient()
  const { error } = await supabase.from('plans').insert({
    key,
    name_az,
    name_ru,
    monthly_price,
    sort_order: Number.isFinite(sort_order) ? sort_order : 0,
    updated_by: userId,
  })
  if (error) {
    return { error: error.code === '23505' ? 'duplicate' : 'generic' }
  }

  // Seed matrix rows (included = false) for the new plan.
  const { data: features } = await supabase.from('features').select('key')
  if (features && features.length > 0) {
    await supabase.from('plan_features').upsert(
      features.map((f) => ({ plan_key: key, feature_key: f.key, included: false })),
      { onConflict: 'plan_key,feature_key' }
    )
  }

  await logAdminAction('plan_edited', { details: { created: key } })
  revalidatePath(`/${locale}/admin/plans`)
  return { ok: true }
}
