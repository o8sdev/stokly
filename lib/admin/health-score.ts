// Tenant health score — Phase-1 data only. Pure functions, computed fresh per
// tenant (never stored). The scoring formula is fixed (product-owned); inputs
// come from public.admin_tenant_metrics (one RPC call per page).

export interface TenantMetrics {
  login_days_last_14: number
  has_recipes: boolean
  stock_count_last_7_days: number
  delivery_logged_last_30_days: boolean
  waste_logged_last_30_days: boolean
  report_viewed_last_30_days: boolean
  recipe_count: number
  ingredient_count: number
  stock_counts_last_28_days: number
  payment_status: 'paid' | 'trial' | 'overdue'
}

export type HealthLabel = 'healthy' | 'fair' | 'risky' | 'critical'

// 0–100. Four 25-point buckets: login frequency, feature usage, setup depth,
// payment health.
export function computeHealthScore(m: TenantMetrics): number {
  let score = 0

  // LOGIN FREQUENCY (25) — days logged in out of the last 14.
  score += Math.min(25, (m.login_days_last_14 / 14) * 25)

  // FEATURE USAGE (25) — 5 pts each for touching a core feature recently.
  if (m.has_recipes) score += 5
  if (m.stock_count_last_7_days >= 1) score += 5
  if (m.delivery_logged_last_30_days) score += 5
  if (m.waste_logged_last_30_days) score += 5
  if (m.report_viewed_last_30_days) score += 5

  // SETUP DEPTH (25) — did they set the product up properly?
  score += Math.min(10, m.recipe_count)
  score +=
    m.ingredient_count >= 20
      ? 5
      : m.ingredient_count >= 10
        ? 3
        : m.ingredient_count >= 5
          ? 1
          : 0
  const avgCountsPerWeek = m.stock_counts_last_28_days / 4
  score += Math.min(10, avgCountsPerWeek * 5)

  // PAYMENT HEALTH (25)
  if (m.payment_status === 'paid') score += 25
  else if (m.payment_status === 'trial') score += 15
  else if (m.payment_status === 'overdue') score += 5

  return Math.round(Math.min(100, score))
}

export function healthLabel(score: number): HealthLabel {
  if (score >= 75) return 'healthy'
  if (score >= 50) return 'fair'
  if (score >= 25) return 'risky'
  return 'critical'
}

// Dark-theme chip classes for the admin console (navy background).
const BADGE: Record<HealthLabel, string> = {
  healthy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  fair: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  risky: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  critical: 'bg-red-500/15 text-red-300 border-red-500/30',
}

export interface HealthBadgeMeta {
  label: HealthLabel
  i18nKey: string // admin.health.<key>
  className: string
}

export function healthBadgeMeta(score: number): HealthBadgeMeta {
  const label = healthLabel(score)
  return { label, i18nKey: label, className: BADGE[label] }
}
