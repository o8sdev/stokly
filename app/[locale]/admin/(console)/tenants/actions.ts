'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { IMPERSONATION_COOKIE } from '@/lib/auth/tenant'

// Enter a restaurant in god-mode: set the impersonation cookie and drop the
// admin into the business app as that tenant.
export async function enterTenant(
  locale: string,
  tenantId: string
): Promise<void> {
  await requirePlatformAdmin(locale)
  cookies().set(IMPERSONATION_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
  redirect(`/${locale}/app/dashboard`)
}
