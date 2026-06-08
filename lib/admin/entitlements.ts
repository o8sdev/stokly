// Feature entitlement resolution — the single source of truth used by BOTH the
// admin console (display) and the business app (gating). Resolution order
// (global kill-switch → per-tenant override → plan inclusion) lives in the
// SECURITY DEFINER SQL functions; here we just call them and cache per request.

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Feature, PlanFeature, FeatureKey } from '@/types/database'

export const getFeatures = cache(async (): Promise<Feature[]> => {
  const supabase = createClient()
  const { data } = await supabase
    .from('features')
    .select('*')
    .order('sort_order', { ascending: true })
  return data ?? []
})

export const getPlanFeatureMatrix = cache(async (): Promise<PlanFeature[]> => {
  const supabase = createClient()
  const { data } = await supabase.from('plan_features').select('*')
  return data ?? []
})

// All resolved entitlements for a tenant in one RPC call. Cached per request so
// a page can check many features without N round-trips.
export const getTenantEntitlements = cache(
  async (tenantId: string): Promise<Record<string, boolean>> => {
    const supabase = createClient()
    const { data } = await supabase.rpc('tenant_entitlements', {
      p_tenant: tenantId,
    })
    const map: Record<string, boolean> = {}
    for (const row of data ?? []) map[row.feature_key] = row.enabled
    return map
  }
)

// Single-feature check (uses the cached entitlement set).
export async function tenantHasFeature(
  tenantId: string,
  key: FeatureKey
): Promise<boolean> {
  const ent = await getTenantEntitlements(tenantId)
  return ent[key] ?? false
}

// Per-tenant overrides currently set (for the feature-flags admin page).
export interface TenantOverrideRow {
  feature_key: string
  tenant_id: string
  enabled: boolean
  tenant_name: string | null
}

export async function getTenantOverrides(): Promise<TenantOverrideRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('tenant_feature_overrides')
    .select('feature_key, tenant_id, enabled')
  const rows = data ?? []
  if (rows.length === 0) return []
  const ids = [...new Set(rows.map((r) => r.tenant_id))]
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name')
    .in('id', ids)
  const names = new Map((tenants ?? []).map((t) => [t.id, t.name]))
  return rows.map((r) => ({ ...r, tenant_name: names.get(r.tenant_id) ?? null }))
}
