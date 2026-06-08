// Admin notifications. Event-driven types (new_signup, plan_upgraded,
// payment_received) are raised by DB triggers. The time-based types here are
// computed by refreshAdminNotifications() and idempotently upserted on a
// dedupe_key, so repeated runs (dashboard load + /api/admin/cron) never
// duplicate. pg_cron is unavailable, hence the app-side approach.

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import type { AdminNotification } from '@/types/database'
import { getOnboardingProgressBatch } from './onboarding'

type Client = ReturnType<typeof createClient>
type NotificationInsert =
  Database['public']['Tables']['admin_notifications']['Insert']

const DAY = 86400000

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / DAY -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7
    )
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function dateOnly(value: string): string {
  return value.slice(0, 10)
}

export async function refreshAdminNotifications(
  client?: Client
): Promise<{ inserted: number }> {
  const supabase = client ?? createClient()
  const now = Date.now()
  const inserts: NotificationInsert[] = []

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, status, trial_ends_at, last_active_at')
    .in('status', ['trial', 'active'])
  const list = tenants ?? []

  // 1. trial_expiring — trial ends within 3 days.
  for (const t of list) {
    if (t.status !== 'trial' || !t.trial_ends_at) continue
    const ends = new Date(t.trial_ends_at).getTime()
    const days = Math.ceil((ends - now) / DAY)
    if (days >= 0 && days <= 3) {
      inserts.push({
        type: 'trial_expiring',
        tenant_id: t.id,
        title: t.name,
        body: `Trial ${days} gün sonra bitir`,
        dedupe_key: `trial_expiring:${t.id}:${dateOnly(t.trial_ends_at)}`,
      })
    }
  }

  // 3. no_login — active tenant silent for 7+ days.
  for (const t of list) {
    if (t.status !== 'active') continue
    const silent =
      !t.last_active_at || now - new Date(t.last_active_at).getTime() > 7 * DAY
    if (silent) {
      inserts.push({
        type: 'no_login',
        tenant_id: t.id,
        title: t.name,
        body: '7+ gündür daxil olmayıb — churn riski',
        dedupe_key: `no_login:${t.id}:${isoWeek(new Date())}`,
      })
    }
  }

  // 4. payment_overdue — active, last covered period ended 3+ days ago.
  const activeIds = list.filter((t) => t.status === 'active').map((t) => t.id)
  if (activeIds.length > 0) {
    const { data: payments } = await supabase
      .from('manual_payments')
      .select('tenant_id, period_end, paid_at')
      .in('tenant_id', activeIds)
    const lastCovered = new Map<string, string>()
    for (const p of payments ?? []) {
      const covered = p.period_end ?? dateOnly(p.paid_at)
      const prev = lastCovered.get(p.tenant_id)
      if (!prev || covered > prev) lastCovered.set(p.tenant_id, covered)
    }
    for (const t of list) {
      if (t.status !== 'active') continue
      const covered = lastCovered.get(t.id)
      const coveredMs = covered ? new Date(covered).getTime() : 0
      const overdueDays = covered
        ? Math.floor((now - coveredMs) / DAY)
        : null
      if (!covered || now - coveredMs > 3 * DAY) {
        inserts.push({
          type: 'payment_overdue',
          tenant_id: t.id,
          title: t.name,
          body: overdueDays
            ? `Ödəniş ${overdueDays} gün gecikir`
            : 'Ödəniş qeydə alınmayıb',
          dedupe_key: `payment_overdue:${t.id}:${covered ?? 'none'}`,
        })
      }
    }
  }

  // 2. onboarding_stuck — trial tenants stuck 48h+ on the same step.
  const trialIds = list.filter((t) => t.status === 'trial').map((t) => t.id)
  if (trialIds.length > 0) {
    const progress = await getOnboardingProgressBatch(trialIds)
    const nameById = new Map(list.map((t) => [t.id, t.name]))
    for (const p of progress) {
      if (p.isStuck && p.stuckSince) {
        inserts.push({
          type: 'onboarding_stuck',
          tenant_id: p.tenantId,
          title: nameById.get(p.tenantId) ?? '—',
          body: `'${p.currentStep}' addımında ${p.daysSinceProgress} gündür irəliləmir`,
          dedupe_key: `onboarding_stuck:${p.tenantId}:${dateOnly(p.stuckSince)}`,
        })
      }
    }
  }

  if (inserts.length === 0) return { inserted: 0 }
  const { data } = await supabase
    .from('admin_notifications')
    .upsert(inserts, { onConflict: 'dedupe_key', ignoreDuplicates: true })
    .select('id')
  return { inserted: data?.length ?? 0 }
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('admin_notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)
  return count ?? 0
}

export async function getNotifications(
  limit = 50,
  filter?: { unreadOnly?: boolean; type?: string }
): Promise<AdminNotification[]> {
  const supabase = createClient()
  let q = supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (filter?.unreadOnly) q = q.is('read_at', null)
  if (filter?.type) q = q.eq('type', filter.type as AdminNotification['type'])
  const { data } = await q
  return data ?? []
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('admin_notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('admin_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
}
