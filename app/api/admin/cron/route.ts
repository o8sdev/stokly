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
  return NextResponse.json(result)
}
