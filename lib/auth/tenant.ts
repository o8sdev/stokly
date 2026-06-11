import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Role, TenantStatus } from '@/types/database'

export const IMPERSONATION_COOKIE = 'stokly_admin_tenant'

export interface TenantContext {
  userId: string
  email: string | null
  tenantId: string
  role: Role
  // True when a system admin is impersonating this tenant (god-mode).
  isAdmin: boolean
  // Tenant lifecycle status. Blocked statuses (suspended/churned/deleted) never
  // reach callers for real members — requireTenant redirects them to
  // /app/suspended; admin impersonation is always reported as 'active'.
  status: TenantStatus
}

// Resolve the active tenant for business (/app) pages and actions.
//
// • Normal user → their tenant_members row (tenant_id is server-resolved, never
//   from client input).
// • System admin → the tenant they are impersonating (selected-tenant cookie),
//   with role 'owner' so they can fully use/edit it. RLS allows this via the
//   admin override (migration 008). No selected tenant → back to the console.
export async function requireTenant(locale: string): Promise<TenantContext> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/app/login`)
  }

  const { data: isAdmin } = await supabase.rpc('is_platform_admin')

  if (isAdmin === true) {
    const impersonated = cookies().get(IMPERSONATION_COOKIE)?.value
    if (impersonated) {
      return {
        userId: user.id,
        email: user.email ?? null,
        tenantId: impersonated,
        role: 'owner',
        isAdmin: true,
        status: 'active',
      }
    }
    // Admin with no restaurant selected → pick one in the console.
    redirect(`/${locale}/admin`)
  }

  const { data: member } = await supabase
    .from('tenant_members')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!member) {
    redirect(`/${locale}/app/login`)
  }

  // Enforce the tenant lifecycle status (admins impersonating are exempt — they
  // returned above). A trial whose window has elapsed is lazily auto-suspended on
  // this load, so enforcement holds even when the cron sweep never runs; the
  // redirect itself is driven by the computed status, so it is correct even if
  // the persisting write is a no-op.
  const { data: tenant } = await supabase
    .from('tenants')
    .select('status, trial_ends_at')
    .eq('id', member.tenant_id)
    .maybeSingle()

  let status: TenantStatus = tenant?.status ?? 'active'
  if (
    status === 'trial' &&
    tenant?.trial_ends_at &&
    new Date(tenant.trial_ends_at).getTime() < Date.now()
  ) {
    status = 'suspended'
    await supabase
      .from('tenants')
      .update({ status: 'suspended', suspended_at: new Date().toISOString() })
      .eq('id', member.tenant_id)
      .eq('status', 'trial')
  }
  if (status === 'suspended' || status === 'churned' || status === 'deleted') {
    redirect(`/${locale}/app/suspended`)
  }

  // Throttled "last active" stamp — normal members only, never during admin
  // impersonation. The OR filter makes this a no-op write when already fresh
  // (within the last hour), so it is cheap to run on every protected request.
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  await supabase
    .from('tenants')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', member.tenant_id)
    .or(`last_active_at.is.null,last_active_at.lt.${cutoff}`)

  return {
    userId: user.id,
    email: user.email ?? null,
    tenantId: member.tenant_id,
    role: member.role as Role,
    isAdmin: false,
    status,
  }
}

export function canWrite(role: Role): boolean {
  return role === 'owner' || role === 'manager'
}
