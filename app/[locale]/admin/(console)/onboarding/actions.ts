'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { logAdminAction } from '@/lib/admin/audit'

// Log that a nudge was sent (the WhatsApp text is copied client-side). Creates
// an admin note so the outreach is visible on the tenant timeline.
export async function sendNudge(
  locale: string,
  tenantId: string,
  step: string
): Promise<void> {
  const ctx = await requirePlatformAdmin(locale)
  const supabase = createClient()
  await supabase.from('admin_notes').insert({
    tenant_id: tenantId,
    body: `Nudge göndərildi — addım: ${step}`,
    author_id: ctx.userId,
    author_email: ctx.email,
  })
  await logAdminAction('nudge_sent', { targetTenantId: tenantId, details: { step } })
  revalidatePath(`/${locale}/admin/onboarding`)
}
