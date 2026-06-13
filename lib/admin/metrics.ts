// Admin dashboard metrics. Dashboard aggregates are small fixed queries; the
// only N+1 hazard — per-row health on the tenant table — is solved by a single
// admin_tenant_metrics RPC call per page.

import { createClient } from '@/lib/supabase/server'
import type { Json, TenantStatus } from '@/types/database'
import {
  computeHealthScore,
  healthLabel,
  type TenantMetrics,
  type HealthLabel,
} from './health-score'
import { getPlans, priceOf } from './plans'

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function startOfMonthISO(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

// ── MRR ───────────────────────────────────────────────────────────────────
export interface MrrPoint {
  month: string
  mrr: number
}
export interface MrrMetrics {
  thisMonth: number
  lastMonth: number
  deltaAzn: number
  series: MrrPoint[]
}

export async function getMRRMetrics(): Promise<MrrMetrics> {
  const supabase = createClient()
  // Count only LIVE tenants (exclude deleted/churned — their revenue isn't
  // recurring) and only the last ~13 months of payments (all the 12-month
  // series needs). Keeps the headline honest and the scan bounded.
  const windowStart = new Date()
  windowStart.setMonth(windowStart.getMonth() - 13)
  const { data } = await supabase
    .from('manual_payments')
    .select('amount, period_start, period_end, paid_at, tenants!inner(status)')
    .gte('paid_at', windowStart.toISOString())
    .in('tenants.status', ['active', 'trial', 'suspended'])

  // True MRR, not cash collected: a payment covering [period_start, period_end]
  // is recognised evenly across every month it spans, so a 3-month prepayment
  // contributes a third per month instead of spiking its banking month.
  // Payments without period dates fall back to their paid month. Spans are
  // capped at 24 months as a bad-data guard.
  const buckets = new Map<string, number>()
  for (const p of data ?? []) {
    const amount = Number(p.amount)
    if (!Number.isFinite(amount)) continue
    const start = new Date(p.period_start ?? p.paid_at)
    if (Number.isNaN(start.getTime())) continue
    const end = p.period_end ? new Date(p.period_end) : start
    const months: string[] = []
    let cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
    const last = Number.isNaN(end.getTime()) ? cur : end
    for (let i = 0; i < 24 && cur.getTime() <= last.getTime(); i++) {
      months.push(monthKey(cur))
      cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1))
    }
    if (months.length === 0) months.push(monthKey(start))
    const share = amount / months.length
    for (const key of months) {
      buckets.set(key, (buckets.get(key) ?? 0) + share)
    }
  }

  const now = new Date()
  const series: MrrPoint[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const key = monthKey(d)
    series.push({ month: key, mrr: buckets.get(key) ?? 0 })
  }

  const thisMonth = series[series.length - 1]?.mrr ?? 0
  const lastMonth = series[series.length - 2]?.mrr ?? 0
  return { thisMonth, lastMonth, deltaAzn: thisMonth - lastMonth, series }
}

// ── Tenant counts / plan mix ───────────────────────────────────────────────
export interface ActiveCounts {
  active: number
  paid: number
  trial: number
  total: number
}

export async function getActiveTenantCounts(): Promise<ActiveCounts> {
  const supabase = createClient()
  const { data } = await supabase
    .from('tenants')
    .select('status')
    .neq('status', 'deleted')
  let active = 0
  let trial = 0
  for (const t of data ?? []) {
    if (t.status === 'active') active += 1
    else if (t.status === 'trial') trial += 1
  }
  return { active, paid: active, trial, total: (data ?? []).length }
}

export interface PlanSlice {
  plan: string
  count: number
}

export async function getTenantsByPlan(): Promise<PlanSlice[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('tenants')
    .select('plan_tier')
    .neq('status', 'deleted')
  const counts = new Map<string, number>()
  for (const t of data ?? []) {
    counts.set(t.plan_tier, (counts.get(t.plan_tier) ?? 0) + 1)
  }
  const plans = await getPlans()
  return plans.map((p) => ({ plan: p.key, count: counts.get(p.key) ?? 0 }))
}

// ── Trial conversion (last N days) ─────────────────────────────────────────
export interface TrialConversion {
  converted: number
  total: number
  rate: number
}

export async function getTrialConversion(days = 90): Promise<TrialConversion> {
  const supabase = createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data } = await supabase
    .from('tenants')
    .select('status')
    .gte('created_at', since.toISOString())
    .neq('status', 'deleted')
  const total = (data ?? []).length
  const converted = (data ?? []).filter((t) => t.status === 'active').length
  return { converted, total, rate: total ? Math.round((converted / total) * 100) : 0 }
}

// ── Churn this month ───────────────────────────────────────────────────────
export interface ChurnSummary {
  count: number
  mrrLost: number
}

export async function getChurnThisMonth(): Promise<ChurnSummary> {
  const supabase = createClient()
  const start = startOfMonthISO()
  const { data } = await supabase
    .from('tenants')
    .select('plan_tier, churned_at, suspended_at')
    .or(`churned_at.gte.${start},suspended_at.gte.${start}`)
  const plans = await getPlans()
  let count = 0
  let mrrLost = 0
  for (const t of data ?? []) {
    count += 1
    mrrLost += priceOf(plans, t.plan_tier)
  }
  return { count, mrrLost }
}

// ── Batched health (one RPC) ───────────────────────────────────────────────
export interface TenantHealthRow {
  tenantId: string
  metrics: TenantMetrics
  score: number
  label: HealthLabel
}

export async function getTenantMetricsBatch(
  ids: string[]
): Promise<Map<string, TenantHealthRow>> {
  const result = new Map<string, TenantHealthRow>()
  if (ids.length === 0) return result
  const supabase = createClient()
  const { data } = await supabase.rpc('admin_tenant_metrics', { p_ids: ids })
  for (const row of data ?? []) {
    const metrics: TenantMetrics = {
      login_days_last_14: row.login_days_last_14,
      has_recipes: row.has_recipes,
      stock_count_last_7_days: row.stock_count_last_7_days,
      delivery_logged_last_30_days: row.delivery_logged_last_30_days,
      waste_logged_last_30_days: row.waste_logged_last_30_days,
      report_viewed_last_30_days: row.report_viewed_last_30_days,
      recipe_count: row.recipe_count,
      ingredient_count: row.ingredient_count,
      stock_counts_last_28_days: row.stock_counts_last_28_days,
      payment_status: row.payment_status as TenantMetrics['payment_status'],
    }
    const score = computeHealthScore(metrics)
    result.set(row.tenant_id, {
      tenantId: row.tenant_id,
      metrics,
      score,
      label: healthLabel(score),
    })
  }
  return result
}

// ── Churn risk (top N) ─────────────────────────────────────────────────────
export interface ChurnRiskRow {
  id: string
  name: string
  lastActive: string | null
  status: TenantStatus
  planTier: string
  score: number
  label: HealthLabel
  reasons: string[]
}

export async function getChurnRisk(limit = 5): Promise<ChurnRiskRow[]> {
  const supabase = createClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, last_active_at, status, plan_tier')
    .in('status', ['active', 'trial', 'suspended'])
    .limit(500)
  const list = tenants ?? []
  const metrics = await getTenantMetricsBatch(list.map((t) => t.id))
  const now = Date.now()
  const rows: ChurnRiskRow[] = []
  for (const t of list) {
    const h = metrics.get(t.id)
    const score = h?.score ?? 0
    const lastMs = t.last_active_at ? new Date(t.last_active_at).getTime() : 0
    const noLogin14 = !t.last_active_at || now - lastMs > 14 * 86400000
    const overdue = h?.metrics.payment_status === 'overdue'
    const lowHealth = score < 40
    if (noLogin14 || overdue || lowHealth) {
      const reasons: string[] = []
      if (noLogin14) reasons.push('no_login')
      if (overdue) reasons.push('overdue')
      if (lowHealth) reasons.push('low_health')
      rows.push({
        id: t.id,
        name: t.name,
        lastActive: t.last_active_at,
        status: t.status,
        planTier: t.plan_tier,
        score,
        label: h?.label ?? 'critical',
        reasons,
      })
    }
  }
  rows.sort((a, b) => a.score - b.score)
  return rows.slice(0, limit)
}

// ── Activity feed ──────────────────────────────────────────────────────────
export interface FeedItem {
  id: string
  type: string
  tenantId: string
  tenantName: string | null
  createdAt: string
  metadata: Json
}

async function loadFeed(limit: number, types?: string[]): Promise<FeedItem[]> {
  const supabase = createClient()
  let q = supabase
    .from('activity_events')
    .select('id, type, metadata, created_at, tenant_id')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (types && types.length > 0) q = q.in('type', types)
  const { data } = await q
  const events = data ?? []
  if (events.length === 0) return []
  const ids = [...new Set(events.map((e) => e.tenant_id))]
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name')
    .in('id', ids)
  const names = new Map((tenants ?? []).map((t) => [t.id, t.name]))
  return events.map((e) => ({
    id: e.id,
    type: e.type,
    tenantId: e.tenant_id,
    tenantName: names.get(e.tenant_id) ?? null,
    createdAt: e.created_at,
    metadata: e.metadata,
  }))
}

export async function getActivityFeed(limit = 20): Promise<FeedItem[]> {
  return loadFeed(limit)
}

// Panel 3: only "notable" lifecycle events (excludes login/report noise).
export async function getRecentActivity(limit = 5): Promise<FeedItem[]> {
  return loadFeed(limit, ['signup', 'payment_received', 'plan_changed'])
}
