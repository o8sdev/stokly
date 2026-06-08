import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Plus } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { listTenants, type TenantFilter } from '@/lib/admin/queries'
import { getTenantMetricsBatch } from '@/lib/admin/metrics'
import { getPlans, planName, planColor, priceOf } from '@/lib/admin/plans'
import { healthLabel } from '@/lib/admin/health-score'
import { Pagination } from '@/components/ui/pagination'
import { TenantFilterBar } from '@/components/admin/tenant-filter-bar'
import { TenantsTable, type TenantRow } from '@/components/admin/tenants-table'

type SP = Record<string, string | string[] | undefined>
const str = (v: string | string[] | undefined): string | undefined =>
  typeof v === 'string' ? v : undefined

function ingBucket(n: number): string {
  if (n === 0) return '0'
  if (n <= 10) return '1-10'
  if (n <= 50) return '11-50'
  return '50+'
}
function recBucket(n: number): string {
  if (n === 0) return '0'
  if (n <= 5) return '1-5'
  if (n <= 20) return '6-20'
  return '20+'
}

export default async function AdminTenantsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: SP
}) {
  setRequestLocale(locale)
  const ctx = await requirePlatformAdmin(locale)
  const t = await getTranslations('admin.tenants')
  const canManage = ctx.role === 'super'

  const pageSize = Number(str(searchParams.size)) || 25
  const filter: TenantFilter = {
    search: str(searchParams.search),
    plan: str(searchParams.plan),
    status: str(searchParams.status),
    signupFrom: str(searchParams.signupFrom),
    signupTo: str(searchParams.signupTo),
    lastActive: str(searchParams.lastActive) as TenantFilter['lastActive'],
    sort: (str(searchParams.sort) as TenantFilter['sort']) ?? 'created_at',
    dir: (str(searchParams.dir) as TenantFilter['dir']) ?? 'desc',
    page: Number(str(searchParams.page)) || 1,
    pageSize,
  }

  const [{ rows, total, page, pageCount }, plans] = await Promise.all([
    listTenants(filter),
    getPlans(),
  ])
  const metrics = await getTenantMetricsBatch(rows.map((r) => r.id))

  let display: TenantRow[] = rows.map((tn) => {
    const m = metrics.get(tn.id)
    const score = m?.score ?? 0
    return {
      id: tn.id,
      name: tn.name,
      slug: tn.slug,
      status: tn.status,
      plan_tier: tn.plan_tier,
      planLabel: planName(plans, tn.plan_tier, locale),
      planColor: planColor(tn.plan_tier),
      created_at: tn.created_at,
      last_active_at: tn.last_active_at,
      score,
      mrr: priceOf(plans, tn.plan_tier),
      paymentStatus: m?.metrics.payment_status ?? 'trial',
      ingredientCount: m?.metrics.ingredient_count ?? 0,
      recipeCount: m?.metrics.recipe_count ?? 0,
    }
  })

  // View filters (health / payment / counts) over the page rows.
  const fHealth = str(searchParams.health)
  const fPay = str(searchParams.payment)
  const fIng = str(searchParams.ing)
  const fRec = str(searchParams.rec)
  if (fHealth) display = display.filter((r) => healthLabel(r.score) === fHealth)
  if (fPay) display = display.filter((r) => r.paymentStatus === fPay)
  if (fIng) display = display.filter((r) => ingBucket(r.ingredientCount) === fIng)
  if (fRec) display = display.filter((r) => recBucket(r.recipeCount) === fRec)

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  function hrefForPage(p: number): string {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === 'string') sp.set(k, v)
    }
    sp.set('page', String(p))
    return `/admin/tenants?${sp.toString()}`
  }
  function sizeHref(size: number): string {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === 'string' && k !== 'size' && k !== 'page') sp.set(k, v)
    }
    sp.set('size', String(size))
    return `/admin/tenants?${sp.toString()}`
  }

  const planOpts = plans
    .filter((p) => p.is_active)
    .map((p) => ({ key: p.key, label: planName(plans, p.key, locale) }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <Link
          href="/admin/businesses/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-[#04231A] transition-colors hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" />
          {t('new_business')}
        </Link>
      </div>

      <TenantFilterBar plans={planOpts} />

      <TenantsTable
        rows={display}
        plans={plans}
        locale={locale}
        canManage={canManage}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {t('results', { total, from, to })}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            {[25, 50, 100].map((s) => (
              <Link
                key={s}
                href={sizeHref(s)}
                className={
                  s === pageSize
                    ? 'rounded bg-white/10 px-2 py-1 font-semibold text-white'
                    : 'rounded px-2 py-1 hover:text-white'
                }
              >
                {s}
              </Link>
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} hrefForPage={hrefForPage} />
        </div>
      </div>
    </div>
  )
}
