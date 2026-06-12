import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refreshAdminNotifications } from '@/lib/admin/notifications'

// POST /api/admin/cron — secret-guarded endpoint for an external scheduler
// (Vercel Cron / GitHub Action) to regenerate time-based admin notifications.
// pg_cron is unavailable, so this runs app-side. Idempotent (dedupe_key).
//
// Note: onboarding_stuck relies on a per-tenant RPC that is gated to a real
// admin session, so it is generated opportunistically on dashboard load; this
// endpoint reliably covers trial_expiring / no_login / payment_overdue.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const supabase = createAdminClient()
  const result = await refreshAdminNotifications(supabase)

  // Auto-suspend trials whose window has elapsed. pg_cron is unavailable, so —
  // like the notification refresh above — this runs app-side via the service
  // role. Catches tenants who never log in (the lazy-suspend in requireTenant
  // only fires on access), keeping suspended-account metrics honest.
  const nowIso = new Date().toISOString()
  const { data: suspended } = await supabase
    .from('tenants')
    .update({ status: 'suspended', suspended_at: nowIso })
    .eq('status', 'trial')
    .lt('trial_ends_at', nowIso)
    .select('id')

  // Paid-lifecycle sweep (migration 049): suspend active paid accounts whose
  // payment coverage lapsed past the grace window, and flip long-suspended
  // accounts with no payment since suspension to churned. Any later payment
  // reactivates either state via on_payment_recorded.
  const { data: sweep } = await supabase.rpc('subscription_sweep', {
    p_paid_grace_days: 7,
    p_churn_after_days: 30,
  })

  return NextResponse.json({
    ...result,
    suspended: suspended?.length ?? 0,
    ...(typeof sweep === 'object' && sweep !== null ? sweep : {}),
  })
}
