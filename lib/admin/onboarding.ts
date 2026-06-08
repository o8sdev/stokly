// Onboarding milestones (10 steps), derived — NOT stored. Completion + the
// completion timestamp come from source-table timestamps via the
// admin_onboarding_progress RPC (one call for many tenants). "Stuck since" is
// the timestamp of the last completed milestone.

import { createClient } from '@/lib/supabase/server'
import type { TenantStatus } from '@/types/database'
import { MILESTONE_COUNT, type MilestoneKey } from './onboarding-constants'

export {
  MILESTONE_KEYS,
  MILESTONE_COUNT,
  type MilestoneKey,
} from './onboarding-constants'

const STUCK_MS = 48 * 60 * 60 * 1000

export interface Milestone {
  key: MilestoneKey
  completed: boolean
  completedAt: string | null
}

export interface OnboardingProgress {
  tenantId: string
  status: TenantStatus
  milestones: Milestone[]
  completedCount: number
  currentStep: MilestoneKey | null // next incomplete (null = all done)
  lastCompletedAt: string | null
  stuckSince: string | null
  isStuck: boolean
  daysSinceProgress: number | null
}

interface ProgressRow {
  tenant_id: string
  created_at: string
  first_ingredient_at: string | null
  tenth_ingredient_at: string | null
  first_recipe_at: string | null
  first_count_at: string | null
  first_delivery_at: string | null
  first_waste_at: string | null
  first_report_at: string | null
  login_dates: string[] | null
  first_payment_at: string | null
  status: TenantStatus
}

// Earliest date that completes a 7-consecutive-calendar-day login streak.
function sevenDayStreakDate(dates: string[] | null): string | null {
  if (!dates || dates.length < 7) return null
  const sorted = [...new Set(dates)].sort()
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00Z').getTime()
    const cur = new Date(sorted[i] + 'T00:00:00Z').getTime()
    const dayDiff = Math.round((cur - prev) / 86400000)
    if (dayDiff === 1) {
      run += 1
      if (run >= 7) return sorted[i]
    } else if (dayDiff > 1) {
      run = 1
    }
  }
  return null
}

function buildProgress(r: ProgressRow): OnboardingProgress {
  const convertedAt =
    r.first_payment_at ?? (r.status === 'active' ? r.created_at : null)

  const base: { key: MilestoneKey; completedAt: string | null }[] = [
    { key: 'signed_up', completedAt: r.created_at },
    { key: 'first_ingredient', completedAt: r.first_ingredient_at },
    { key: 'ten_ingredients', completedAt: r.tenth_ingredient_at },
    { key: 'first_recipe', completedAt: r.first_recipe_at },
    { key: 'first_count', completedAt: r.first_count_at },
    { key: 'first_delivery', completedAt: r.first_delivery_at },
    { key: 'first_waste', completedAt: r.first_waste_at },
    { key: 'report_viewed', completedAt: r.first_report_at },
    { key: 'active_7_days', completedAt: sevenDayStreakDate(r.login_dates) },
    { key: 'converted', completedAt: convertedAt },
  ]
  const milestones: Milestone[] = base.map((m) => ({
    ...m,
    completed: m.completedAt !== null,
  }))

  const completedCount = milestones.filter((m) => m.completed).length
  const next = milestones.find((m) => !m.completed)
  const currentStep = next ? next.key : null

  const lastCompletedAt = milestones
    .filter((m) => m.completed && m.completedAt)
    .map((m) => m.completedAt as string)
    .sort()
    .at(-1) ?? null

  const allDone = completedCount === MILESTONE_COUNT
  const sinceMs = lastCompletedAt
    ? Date.now() - new Date(lastCompletedAt).getTime()
    : null
  const isStuck = !allDone && sinceMs !== null && sinceMs > STUCK_MS

  return {
    tenantId: r.tenant_id,
    status: r.status,
    milestones,
    completedCount,
    currentStep,
    lastCompletedAt,
    stuckSince: isStuck ? lastCompletedAt : null,
    isStuck,
    daysSinceProgress:
      sinceMs !== null ? Math.floor(sinceMs / 86400000) : null,
  }
}

export async function getOnboardingProgressBatch(
  ids: string[]
): Promise<OnboardingProgress[]> {
  if (ids.length === 0) return []
  const supabase = createClient()
  const { data } = await supabase.rpc('admin_onboarding_progress', {
    p_ids: ids,
  })
  return (data ?? []).map((r) => buildProgress(r as ProgressRow))
}

export async function getOnboardingProgress(
  tenantId: string
): Promise<OnboardingProgress | null> {
  const [p] = await getOnboardingProgressBatch([tenantId])
  return p ?? null
}

export interface OnboardingStuckRow extends OnboardingProgress {
  name: string
  lastLogin: string | null
}

// Trial tenants whose onboarding has not progressed in 48h+, longest-stuck first.
export async function getOnboardingStuck(
  limit = 5
): Promise<OnboardingStuckRow[]> {
  const supabase = createClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, last_active_at')
    .eq('status', 'trial')
    .limit(500)
  const list = tenants ?? []
  if (list.length === 0) return []
  const progress = await getOnboardingProgressBatch(list.map((t) => t.id))
  const byId = new Map(progress.map((p) => [p.tenantId, p]))
  const rows: OnboardingStuckRow[] = []
  for (const t of list) {
    const p = byId.get(t.id)
    if (p && p.isStuck) {
      rows.push({ ...p, name: t.name, lastLogin: t.last_active_at })
    }
  }
  rows.sort((a, b) => (a.stuckSince ?? '').localeCompare(b.stuckSince ?? ''))
  return rows.slice(0, limit)
}
