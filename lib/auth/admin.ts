import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AdminRole } from '@/types/database'

export interface AdminContext {
  userId: string
  email: string | null
  role: AdminRole
}

// True if the signed-in user is a system (platform) admin. Backed by the
// is_platform_admin() SECURITY DEFINER function so it works regardless of RLS.
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase.rpc('is_platform_admin')
  return data === true
}

// Gate for the hidden admin area. Requires a logged-in user who is on the
// platform_admins allowlist; everyone else is sent to the (unlisted) login.
// Returns the admin's role so callers can gate destructive actions.
export async function requirePlatformAdmin(
  locale: string
): Promise<AdminContext> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/admin/login`)

  const { data: row } = await supabase
    .from('platform_admins')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!row) redirect(`/${locale}/admin/login`)

  return {
    userId: user.id,
    email: user.email ?? null,
    role: row.role as AdminRole,
  }
}

// Stricter gate for destructive actions (suspend/delete/plan edits etc.).
// Read-only admins are bounced back to the console home.
export async function requireSuperAdmin(locale: string): Promise<AdminContext> {
  const ctx = await requirePlatformAdmin(locale)
  if (ctx.role !== 'super') redirect(`/${locale}/admin`)
  return ctx
}
