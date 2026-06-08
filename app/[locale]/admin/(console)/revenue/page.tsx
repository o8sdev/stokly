import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { listPayments, getOverdueTenants, type PaymentFilter } from '@/lib/admin/queries'
import { getMRRMetrics } from '@/lib/admin/metrics'
import { getPlans, planName, priceOf } from '@/lib/admin/plans'
import { Pagination } from '@/components/ui/pagination'
import { RevenueToolbar } from '@/components/admin/revenue-toolbar'
import { Link } from '@/lib/i18n/navigation'
import { formatMoney, formatDate } from '@/lib/utils'

type SP = Record<string, string | string[] | undefined>
const str = (v: string | string[] | undefined): string | undefined =>
  typeof v === 'string' ? v : undefined

const TH = 'px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400'
const TD = 'px-3 py-2.5'

export default async function AdminRevenuePage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: SP
}) {
  setRequestLocale(locale)
  await requirePlatformAdmin(locale)
  const t = await getTranslations('admin.revenue')
  const supabase = createClient()

  const filter: PaymentFilter = {
    search: str(searchParams.search),
    plan: str(searchParams.plan),
    from: str(searchParams.from),
    to: str(searchParams.to),
    sort: (str(searchParams.sort) as PaymentFilter['sort']) ?? 'paid_at',
    dir: (str(searchParams.dir) as PaymentFilter['dir']) ?? 'desc',
    page: Number(str(searchParams.page)) || 1,
  }

  const [mrr, { rows, total, page, pageCount }, overdue, plans, tenantsRes, allPaymentsRes] =
    await Promise.all([
      getMRRMetrics(),
      listPayments(filter),
      getOverdueTenants(),
      getPlans(),
      supabase
        .from('tenants')
        .select('id, name')
        .neq('status', 'deleted')
        .order('name', { ascending: true })
        .limit(500),
      supabase.from('manual_payments').select('amount'),
    ])

  const totalCollected = (allPaymentsRes.data ?? []).reduce(
    (s, p) => s + Number(p.amount),
    0
  )

  const cards = [
    { label: t('this_month'), value: formatMoney(mrr.thisMonth) },
    { label: t('last_month'), value: formatMoney(mrr.lastMonth) },
    { label: t('total_collected'), value: formatMoney(totalCollected) },
    { label: t('overdue_accounts'), value: String(overdue.length) },
  ]

  function hrefForPage(p: number): string {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === 'string') sp.set(k, v)
    }
    sp.set('page', String(p))
    return `/admin/revenue?${sp.toString()}`
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">{t('title')}</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">{c.label}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <RevenueToolbar
        rows={rows}
        tenants={tenantsRes.data ?? []}
        plans={plans}
        locale={locale}
      />

      <div className="overflow-x-auto rounded-2xl border border-white/10 scroll-thin">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              {[
                t('date'),
                t('tenant'),
                t('plan'),
                t('amount'),
                t('period'),
                t('method'),
                t('reference'),
              ].map((h) => (
                <th key={h} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.06] last:border-0">
                  <td className={TD + ' text-slate-400'}>{formatDate(r.paid_at)}</td>
                  <td className={TD}>
                    <Link
                      href={`/admin/tenants/${r.tenant_id}`}
                      className="font-medium text-white hover:text-brand"
                    >
                      {r.tenant_name ?? '—'}
                    </Link>
                  </td>
                  <td className={TD + ' text-slate-300'}>
                    {planName(plans, r.plan_key, locale)}
                  </td>
                  <td className={TD + ' font-mono font-semibold text-white'}>
                    {formatMoney(r.amount)}
                  </td>
                  <td className={TD + ' text-slate-400'}>
                    {r.period_start ? r.period_start.slice(0, 7) : '—'}
                  </td>
                  <td className={TD + ' text-slate-400'}>{t(r.method)}</td>
                  <td className={TD + ' font-mono text-slate-500'}>{r.reference ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{t('total', { total })}</p>
        <Pagination page={page} pageCount={pageCount} hrefForPage={hrefForPage} />
      </div>

      {overdue.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-[#F08C8C]">
            {t('overdue_title')}
          </h2>
          <div className="space-y-2">
            {overdue.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
              >
                <Link
                  href={`/admin/tenants/${o.id}`}
                  className="font-medium text-white hover:text-brand"
                >
                  {o.name}
                </Link>
                <span className="text-xs text-slate-400">
                  {planName(plans, o.plan_tier, locale)}
                </span>
                <span className="font-mono text-sm text-white">
                  {formatMoney(priceOf(plans, o.plan_tier))}
                </span>
                {o.days_overdue !== null && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-[#F08C8C]">
                    {t('days_overdue', { days: o.days_overdue })}
                  </span>
                )}
                <Link
                  href={`/admin/tenants/${o.id}`}
                  className="ml-auto inline-flex h-8 items-center rounded-lg border border-white/15 px-2.5 text-xs text-slate-200 hover:bg-white/10"
                >
                  {t('record_payment')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
