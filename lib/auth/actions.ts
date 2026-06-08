'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export interface AuthResult {
  error?: string
}

export interface PasswordResetResult {
  error?: string
  success?: boolean
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

// Send a password-reset email. The link returns to /api/auth/callback, which
// exchanges the code for a session and forwards to /app/reset-password. We
// always report success so the form never reveals whether an email is on file.
export async function requestPasswordReset(
  locale: string,
  _prev: PasswordResetResult,
  formData: FormData
): Promise<PasswordResetResult> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email || !email.includes('@')) return { error: 'invalid' }

  const h = headers()
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const host = h.get('host') ?? ''
  const origin = `${proto}://${host}`
  const next = encodeURIComponent(`/${locale}/app/reset-password`)
  const redirectTo = `${origin}/api/auth/callback?next=${next}`

  const supabase = createClient()
  await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  return { success: true }
}

// Set a new password during a recovery session (reached via the email link).
export async function updatePassword(
  locale: string,
  _prev: PasswordResetResult,
  formData: FormData
): Promise<PasswordResetResult> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  if (password.length < 6) return { error: 'weak' }
  if (password !== confirm) return { error: 'mismatch' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'no_session' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: 'generic' }

  redirect(`/${locale}/app/dashboard`)
}
