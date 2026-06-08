import { createClient } from '@/lib/supabase/server'

// Emit a 'report_viewed' activity event for the tenant (powers health scoring +
// the "viewed a report" onboarding milestone). Best-effort; never blocks render.
export async function logReportView(
  tenantId: string,
  userId: string | null,
  report: string
): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.rpc('log_activity', {
      p_tenant: tenantId,
      p_user: userId,
      p_type: 'report_viewed',
      p_meta: { report },
    })
  } catch {
    // ignore
  }
}
