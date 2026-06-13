'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { logAdminAction } from '@/lib/admin/audit'
import type { DemoRequestStatus } from '@/types/database'

export async function updateDemoStatus(
  locale: string,
  id: string,
  status: DemoRequestStatus
): Promise<void> {
  await requirePlatformAdmin(locale)
  const supabase = createClient()
  await supabase.from('demo_requests').update({ status }).eq('id', id)
  await logAdminAction('demo_status_updated', { details: { id, status } })
  revalidatePath(`/${locale}/admin/leads`)
}
