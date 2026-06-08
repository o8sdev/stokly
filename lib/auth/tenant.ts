import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types/database'

export const IMPERSONATION_COOKIE = 'stokly_admin_tenant'

export interface TenantContext {
  userId: string
  email: string | null
  tenantId: string
  role: Role
  // True when a system admin is impersonating this tenant (god-mode).
  isAdmin: boolean
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

  return {
    userId: user.id,
    email: user.email ?? null,
    tenantId: member.tenant_id,
    role: member.role as Role,
    isAdmin: false,
  }
}

export function canWrite(role: Role): boolean {
  return role === 'owner' || role === 'manager'
}
