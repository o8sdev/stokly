'use server'

import { revalidatePath } from 'next/cache'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export interface CreateBusinessResult {
  ok?: boolean
  error?: string
}

// Admin-only: provision a restaurant account. Creates the owner auth user (via
// the Admin API) with restaurant metadata; the on_auth_user_created trigger
// (migration 005) then creates the tenant + owner membership + waste categories.
export async function createBusiness(
  locale: string,
  _prev: CreateBusinessResult,
  formData: FormData
): Promise<CreateBusinessResult> {
  await requirePlatformAdmin(locale)

  const restaurant = String(formData.get('restaurant') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!restaurant || !email || !email.includes('@') || password.length < 6) {
    return { error: 'validation' }
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return { error: 'service_key' }
  }

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { restaurant_name: restaurant, locale },
  })

  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/admin/tenants`)
  return { ok: true }
}
