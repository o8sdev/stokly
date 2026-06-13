'use server'

import { revalidatePath } from 'next/cache'
import { requireSuperAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/admin/audit'

export interface AdminsResult {
  ok?: boolean
  error?: string
}

// Map a Postgres RAISE message to a known key the UI can translate.
function mapErr(message: string): string {
  if (message.includes('user_not_found')) return 'user_not_found'
  if (message.includes('cannot_remove_self')) return 'cannot_remove_self'
  if (message.includes('last_admin')) return 'last_admin'
  if (message.includes('forbidden')) return 'forbidden'
  return 'generic'
}

export async function addAdmin(
  locale: string,
  _prev: AdminsResult,
  formData: FormData
): Promise<AdminsResult> {
  await requireSuperAdmin(locale)
  const email = String(formData.get('email') ?? '').trim()
  const role = String(formData.get('role') ?? 'super') === 'readonly' ? 'readonly' : 'super'
  if (!email || !email.includes('@')) return { error: 'validation' }

  const supabase = createClient()
  const { error } = await supabase.rpc('admin_add_platform_admin', {
    p_email: email,
    p_role: role,
  })
  if (error) return { error: mapErr(error.message) }

  await logAdminAction('admin_added', { details: { email, role } })
  revalidatePath(`/${locale}/admin/admins`)
  return { ok: true }
}

export async function removeAdmin(
  locale: string,
  userId: string
): Promise<AdminsResult> {
  await requireSuperAdmin(locale)
  const supabase = createClient()
  const { error } = await supabase.rpc('admin_remove_platform_admin', {
    p_user_id: userId,
  })
  if (error) return { error: mapErr(error.message) }

  await logAdminAction('admin_removed', { details: { user_id: userId } })
  revalidatePath(`/${locale}/admin/admins`)
  return { ok: true }
}
