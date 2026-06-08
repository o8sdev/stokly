// Admin audit trail. Call logAdminAction() from every admin mutation (incl.
// impersonation enter/exit). Snapshots the actor's email so the record survives
// account deletion. Best-effort: a logging failure never blocks the action.

import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

export interface AuditOptions {
  targetTenantId?: string | null
  details?: Json
}

// Canonical action strings (keep stable — the audit log filters on these).
export type AuditAction =
  | 'tenant_viewed'
  | 'tenant_impersonated'
  | 'impersonation_ended'
  | 'plan_changed'
  | 'trial_extended'
  | 'account_suspended'
  | 'account_reactivated'
  | 'account_deleted'
  | 'account_hard_deleted'
  | 'payment_recorded'
  | 'note_added'
  | 'nudge_sent'
  | 'password_reset'
  | 'tenant_exported'
  | 'invite_created'
  | 'invite_revoked'
  | 'business_created'
  | 'plan_edited'
  | 'feature_flag_changed'
  | 'export_downloaded'

export async function logAdminAction(
  action: AuditAction | string,
  opts: AuditOptions = {}
): Promise<void> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    await supabase.from('admin_audit_log').insert({
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      action,
      target_tenant_id: opts.targetTenantId ?? null,
      details: opts.details ?? {},
    })
  } catch {
    // Never let auditing break the underlying action.
  }
}
