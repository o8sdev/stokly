import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getIngredients,
  getRecipes,
  getRecipeIngredients,
  getStockMovements,
} from '@/lib/data/queries'
import { getTenantById } from '@/lib/admin/queries'
import { getTenantMetricsBatch } from '@/lib/admin/metrics'
import { getOnboardingProgress } from '@/lib/admin/onboarding'
import { getPlans, planName, planColor } from '@/lib/admin/plans'
import { computeRecipesWithCost } from '@/lib/calculations/recipe-cost'
import { deriveAllStockLevels } from '@/lib/calculations/stock-level'
import { HealthBadge } from '@/components/admin/health-badge'
import { TenantControls } from '@/components/admin/tenant-controls'
import {
  TenantDetailTabs,
  type IngRow,
  type RecRow,
  type MoveRow,
  type BatchRow,
  type PayRow,
  type NoteRow,
} from '@/components/admin/tenant-detail-tabs'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-300',
  trial: 'bg-sky-500/15 text-sky-300',
  suspended: 'bg-red-500/15 text-[#F08C8C]',
  churned: 'bg-slate-500/20 text-slate-400',
  deleted: 'bg-slate-500/20 text-slate-500',
}
const DAY = 86400000

export default async function AdminTenantDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string }
}) {
  setRequestLocale(locale)
  const ctx = await requirePlatformAdmin(locale)
  const t = await getTranslations('admin.tenant_detail')
  const canManage = ctx.role === 'super'

  const tenant = await getTenantById(id)
  if (!tenant) notFound()

  const supabase = createClient()
  const [
    metricsMap,
    onboarding,
    plans,
    ingredients,
    recipes,
    recipeIngredients,
    movements,
    batchesRes,
    paymentsRes,
    notesRes,
    loginsRes,
    ownerRes,
  ] = await Promise.all([
    getTenantMetricsBatch([id]),
    getOnboardingProgress(id),
    getPlans(),
    getIngredients(id),
    getRecipes(id),
    getRecipeIngredients(id),
    getStockMovements(id),
    supabase.from('ingredient_batches').select('*').eq('tenant_id', id),
    supabase
      .from('manual_payments')
      .select('*')
      .eq('tenant_id', id)
      .order('paid_at', { ascending: false }),
    supabase
      .from('admin_notes')
      .select('*')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('activity_events')
      .select('created_at')
      .eq('tenant_id', id)
      .eq('type', 'login')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('tenant_members')
      .select('user_id')
      .eq('tenant_id', id)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle(),
  ])

  const health = metricsMap.get(id)
  const score = health?.score ?? 0

  // Owner contact email (best-effort via service role).
  let ownerEmail: string | null = null
  if (ownerRes.data) {
    try {
      const admin = createAdminClient()
      const { data } = await admin.auth.admin.getUserById(ownerRes.data.user_id)
      ownerEmail = data.user?.email ?? null
    } catch {
      ownerEmail = null
    }
  }

  const ingMap = new Map(ingredients.map((i) => [i.id, i]))
  const levels = deriveAllStockLevels(movements)
  const recipeCosts = computeRecipesWithCost(ingredients, recipes, recipeIngredients)
  const lastCount =
    movements
      .filter((m) => m.movement_type === 'count')
      .map((m) => m.created_at)
      .sort()
      .at(-1) ?? null

  const ingRows: IngRow[] = ingredients.map((i) => ({
    id: i.id,
    name: (locale === 'ru' ? i.name_ru : i.name_az) || i.name,
    unit: i.unit,
    cost: i.cost_per_unit,
    yield: i.yield_percent ?? 1,
    stock: levels.get(i.id) ?? 0,
  }))

  const recRows: RecRow[] = recipeCosts.map((r) => ({
    id: r.id,
    name: (locale === 'ru' ? r.name_ru : r.name_az) || r.name,
    ingredientCount: r.ingredientCount,
    totalCost: r.totalCost,
    foodCostPercent: r.foodCostPercent,
    salePrice: r.sale_price,
  }))

  const moveRows: MoveRow[] = movements.slice(0, 50).map((m) => {
    const ing = ingMap.get(m.ingredient_id)
    return {
      id: m.id,
      created_at: m.created_at,
      type: m.movement_type,
      ingredient: ing ? (locale === 'ru' ? ing.name_ru : ing.name_az) || ing.name : '—',
      quantity: m.quantity,
      unit: ing?.unit ?? '',
      notes: m.notes,
    }
  })

  const now = Date.now()
  const batchRows: BatchRow[] = (batchesRes.data ?? []).map((b) => ({
    id: b.id,
    ingredient: (() => {
      const ing = ingMap.get(b.ingredient_id)
      return ing ? (locale === 'ru' ? ing.name_ru : ing.name_az) || ing.name : '—'
    })(),
    qtyReceived: b.quantity_received,
    qtyRemaining: b.quantity_remaining,
    unit: b.unit,
    unitCost: b.unit_cost,
    received: b.received_date,
    expiry: b.expiry_date,
    status: b.status,
    expiringSoon:
      b.status === 'active' &&
      b.expiry_date != null &&
      new Date(b.expiry_date).getTime() - now < 7 * DAY,
  }))

  const payRows: PayRow[] = (paymentsRes.data ?? []).map((p) => ({
    id: p.id,
    paid_at: p.paid_at,
    planLabel: planName(plans, p.plan_key, locale),
    amount: p.amount,
    period: p.period_start ? p.period_start.slice(0, 7) : formatDate(p.paid_at),
    method: p.method,
    reference: p.reference,
  }))

  const noteRows: NoteRow[] = (notesRes.data ?? []).map((n) => ({
    id: n.id,
    created_at: n.created_at,
    author: n.author_email ?? '—',
    body: n.body,
  }))

  const trialEndsMs = tenant.trial_ends_at
    ? new Date(tenant.trial_ends_at).getTime()
    : null
  const trialDaysLeft =
    trialEndsMs != null ? Math.ceil((trialEndsMs - now) / DAY) : null
  // Trial window is only meaningful before conversion to a paid/active plan.
  const showTrial = trialEndsMs != null && tenant.status !== 'active'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{tenant.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-200">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: planColor(tenant.plan_tier) }}
              />
              {planName(plans, tenant.plan_tier, locale)}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                STATUS_CLASS[tenant.status] ?? 'bg-slate-500/20 text-slate-400'
              )}
            >
              {t(`status.${tenant.status}`)}
            </span>
            <HealthBadge score={score} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{ownerEmail ?? '—'}</span>
            <span>
              {t('signed_up')}: {formatDate(tenant.created_at)}
            </span>
            <span>
              {t('last_active')}:{' '}
              {tenant.last_active_at
                ? formatRelativeTime(tenant.last_active_at, locale)
                : '—'}
            </span>
          </div>
        </div>
      </div>

      <TenantControls
        variant="bar"
        tenant={{
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          status: tenant.status,
          plan_tier: tenant.plan_tier,
          trial_ends_at: tenant.trial_ends_at,
        }}
        locale={locale}
        plans={plans}
        canManage={canManage}
      />

      {(showTrial || tenant.suspended_at) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {t('lifecycle')}
          </span>
          {showTrial && (
            <span className="text-slate-300">
              {t('trial_ends')}:{' '}
              <span className="text-white">{formatDate(tenant.trial_ends_at)}</span>{' '}
              <span
                className={
                  trialDaysLeft != null && trialDaysLeft < 0
                    ? 'text-[#F08C8C]'
                    : 'text-slate-400'
                }
              >
                (
                {trialDaysLeft != null && trialDaysLeft >= 0
                  ? t('days_left', { days: trialDaysLeft })
                  : t('expired_ago', { days: Math.abs(trialDaysLeft ?? 0) })}
                )
              </span>
            </span>
          )}
          {tenant.suspended_at && (
            <span className="text-slate-300">
              {t('suspended_on')}:{' '}
              <span className="text-white">{formatDate(tenant.suspended_at)}</span>
            </span>
          )}
        </div>
      )}

      <TenantDetailTabs
        locale={locale}
        tenantId={tenant.id}
        plans={plans}
        currentPlan={tenant.plan_tier}
        overview={{
          ingredientCount: ingredients.length,
          recipeCount: recipes.length,
          movementCount: movements.length,
          lastCount,
          milestones: onboarding?.milestones ?? [],
          logins: (loginsRes.data ?? []).map((l) => l.created_at),
        }}
        ingredients={ingRows}
        recipes={recRows}
        movements={moveRows}
        batches={batchRows}
        payments={payRows}
        notes={noteRows}
      />
    </div>
  )
}
