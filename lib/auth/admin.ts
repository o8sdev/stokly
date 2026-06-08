import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface AdminContext {
  userId: string
  email: string | null
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
export async function requirePlatformAdmin(
  locale: string
): Promise<AdminContext> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/admin/login`)

  const { data } = await supabase.rpc('is_platform_admin')
  if (data !== true) redirect(`/${locale}/admin/login`)

  return { userId: user.id, email: user.email ?? null }
}
