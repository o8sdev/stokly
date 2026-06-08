'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import type { DemoRequestStatus } from '@/types/database'

export async function updateDemoStatus(
  locale: string,
  id: string,
  status: DemoRequestStatus
): Promise<void> {
  await requirePlatformAdmin(locale)
  const supabase = createClient()
  await supabase.from('demo_requests').update({ status }).eq('id', id)
  revalidatePath(`/${locale}/admin/leads`)
}
