import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types/database'

export interface TenantContext {
  userId: string
  email: string | null
  tenantId: string
  role: Role
}

// Resolve the authenticated user and their tenant membership for use in
// server components and server actions. The tenant_id is ALWAYS taken from
// tenant_members here — never from client input.
export async function requireTenant(locale: string): Promise<TenantContext> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const { data: member } = await supabase
    .from('tenant_members')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!member) {
    // Authenticated but no tenant — the signup flow is incomplete.
    redirect(`/${locale}/login`)
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    tenantId: member.tenant_id,
    role: member.role as Role,
  }
}

export function canWrite(role: Role): boolean {
  return role === 'owner' || role === 'manager'
}
