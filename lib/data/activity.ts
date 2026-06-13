import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

export interface ActivityEntry {
  id: string
  actor_email: string | null
  action: string
  entity_type: string | null
  meta: Record<string, unknown>
  created_at: string
}

// Best-effort audit write. Logging must never break or block the mutation it
// records, so failures are swallowed. Call AFTER the mutation succeeds.
export async function logActivity(
  action: string,
  opts?: {
    entityType?: string | null
    entityId?: string | null
    meta?: Record<string, unknown>
  }
): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.rpc('log_tenant_activity', {
      p_action: action,
      p_entity_type: opts?.entityType ?? null,
      p_entity_id: opts?.entityId ?? null,
      p_meta: (opts?.meta ?? {}) as Json,
    })
  } catch {
    // intentionally ignored — the audit trail is non-critical to the action
  }
}

// Manager-readable audit trail for a date range (RLS gates this to owners/
// managers; staff get nothing).
export async function getActivityLog(
  tenantId: string,
  from: string,
  to: string
): Promise<ActivityEntry[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('tenant_activity_log')
    .select('id, actor_email, action, entity_type, meta, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', `${from}T00:00:00.000Z`)
    .lte('created_at', `${to}T23:59:59.999Z`)
    .order('created_at', { ascending: false })
    .limit(1000)
  return (data ?? []).map((r) => ({
    id: r.id,
    actor_email: r.actor_email,
    action: r.action,
    entity_type: r.entity_type,
    meta: (r.meta ?? {}) as Record<string, unknown>,
    created_at: r.created_at,
  }))
}

// Resolve a set of user ids -> email (scoped to the caller's tenant by the RPC),
// for the "recorded by" columns on the journals. Returns a Map for easy lookup.
export async function resolveMemberEmails(
  ids: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))]
  if (unique.length === 0) return new Map()
  const supabase = createClient()
  const { data } = await supabase.rpc('tenant_member_emails', { p_ids: unique })
  return new Map((data ?? []).map((r) => [r.user_id, r.email]))
}
