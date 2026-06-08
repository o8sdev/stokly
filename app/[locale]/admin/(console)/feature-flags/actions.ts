'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { logAdminAction } from '@/lib/admin/audit'

async function ensureSuper(locale: string): Promise<string | null> {
  const ctx = await requirePlatformAdmin(locale)
  return ctx.role === 'super' ? ctx.userId : null
}

export async function setFeatureGlobal(
  locale: string,
  featureKey: string,
  enabled: boolean
): Promise<void> {
  const userId = await ensureSuper(locale)
  if (!userId) return
  const supabase = createClient()
  await supabase.from('features').update({ global_enabled: enabled }).eq('key', featureKey)
  await logAdminAction('feature_flag_changed', {
    details: { feature: featureKey, global_enabled: enabled },
  })
  revalidatePath(`/${locale}/admin/feature-flags`)
}

export interface OverrideResult {
  ok?: boolean
  error?: string
}

export async function addOverride(
  locale: string,
  _prev: OverrideResult,
  formData: FormData
): Promise<OverrideResult> {
  const userId = await ensureSuper(locale)
  if (!userId) return { error: 'forbidden' }
  const feature_key = String(formData.get('feature_key') ?? '')
  const tenant_id = String(formData.get('tenant_id') ?? '')
  const enabled = String(formData.get('enabled') ?? 'true') === 'true'
  if (!feature_key || !tenant_id) return { error: 'validation' }

  const supabase = createClient()
  const { error } = await supabase.from('tenant_feature_overrides').upsert(
    {
      feature_key,
      tenant_id,
      enabled,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: 'feature_key,tenant_id' }
  )
  if (error) return { error: 'generic' }
  await logAdminAction('feature_flag_changed', {
    targetTenantId: tenant_id,
    details: { feature: feature_key, override: enabled },
  })
  revalidatePath(`/${locale}/admin/feature-flags`)
  return { ok: true }
}

export async function removeOverride(
  locale: string,
  featureKey: string,
  tenantId: string
): Promise<void> {
  const userId = await ensureSuper(locale)
  if (!userId) return
  const supabase = createClient()
  await supabase
    .from('tenant_feature_overrides')
    .delete()
    .eq('feature_key', featureKey)
    .eq('tenant_id', tenantId)
  await logAdminAction('feature_flag_changed', {
    targetTenantId: tenantId,
    details: { feature: featureKey, override: 'removed' },
  })
  revalidatePath(`/${locale}/admin/feature-flags`)
}
