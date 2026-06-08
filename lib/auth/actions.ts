'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface AuthResult {
  error?: string
}

// Business (tenant) login — hidden portal at /app/login. Lands on the dashboard.
// A platform admin who signs in here is routed onward by requireTenant.
export async function loginBusiness(
  locale: string,
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'invalid' }

  // Record a login activity event for tenant users (never for platform admins,
  // so impersonation/admin logins don't pollute a tenant's usage stats).
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const { data: isAdmin } = await supabase.rpc('is_platform_admin')
    if (isAdmin !== true) {
      const { data: member } = await supabase
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      if (member) {
        await supabase.rpc('log_activity', {
          p_tenant: member.tenant_id,
          p_user: user.id,
          p_type: 'login',
          p_meta: {},
        })
      }
    }
  }

  redirect(`/${locale}/app/dashboard`)
}

// System-admin login — hidden portal at /admin/login. Only platform admins may
// pass; anyone else is signed back out.
export async function loginAdmin(
  locale: string,
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'invalid' }

  const { data: isAdmin } = await supabase.rpc('is_platform_admin')
  if (isAdmin !== true) {
    await supabase.auth.signOut()
    return { error: 'forbidden' }
  }

  redirect(`/${locale}/admin`)
}

// Sign out and return to a portal-appropriate destination.
export async function signout(
  locale: string,
  target?: string
): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect(target ?? `/${locale}`)
}

// Clear admin tenant-impersonation and return to the admin console.
export async function exitImpersonation(locale: string): Promise<void> {
  const { cookies } = await import('next/headers')
  cookies().delete('stokly_admin_tenant')
  redirect(`/${locale}/admin`)
}
