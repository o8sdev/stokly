'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowUp, ArrowDown, ChevronsUpDown, Ban, Download } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { Checkbox } from '@/components/ui/checkbox'
import { HealthBadge } from './health-badge'
import { TenantControls } from './tenant-controls'
import { bulkSuspend, bulkChangePlan } from '@/app/[locale]/admin/(console)/tenants/actions'
import { toCsv, downloadCsv } from '@/lib/admin/csv'
import { formatMoney, formatDate, formatRelativeTime, cn } from '@/lib/utils'
import type { Plan, TenantStatus } from '@/types/database'

export interface TenantRow {
  id: string
  name: string
  slug: string
  status: TenantStatus
  plan_tier: string
  planLabel: string
  planColor: string
  created_at: string
  last_active_at: string | null
  score: number
  mrr: number
  paymentStatus: string
  ingredientCount: number
  recipeCount: number
}

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-300',
  trial: 'bg-sky-500/15 text-sky-300',
  suspended: 'bg-red-500/15 text-[#F08C8C]',
  churned: 'bg-slate-500/20 text-slate-400',
  deleted: 'bg-slate-500/20 text-slate-500',
}
const PAY_CLASS: Record<string, string> = {
  paid: 'text-emerald-300',
  overdue: 'text-[#F08C8C]',
  trial: 'text-sky-300',
}

export function TenantsTable({
  rows,
  plans,
  locale,
  canManage,
}: {
  rows: TenantRow[]
  plans: Plan[]
  locale: string
  canManage: boolean
}) {
  const t = useTranslations('admin.tenants')
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [bulkPlan, setBulkPlan] = React.useState('')
  const [, start] = React.useTransition()

  const sort = params.get('sort') ?? 'created_at'
  const dir = params.get('dir') ?? 'desc'

  function setSort(col: string) {
    const next = new URLSearchParams(params.toString())
    const nextDir = sort === col && dir === 'asc' ? 'desc' : 'asc'
    next.set('sort', col)
    next.set('dir', nextDir)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))
  }

  const ids = [...selected]
  function exportSelected() {
    const chosen = rows.filter((r) => selected.has(r.id))
    const csv = toCsv(chosen, [
      { header: 'Restaurant', value: (r) => r.name },
      { header: 'Plan', value: (r) => r.planLabel },
      { header: 'Status', value: (r) => r.status },
      { header: 'MRR', value: (r) => r.mrr },
      { header: 'Health', value: (r) => r.score },
      { header: 'Signup', value: (r) => r.created_at },
    ])
    downloadCsv('stokly-tenants.csv', csv)
  }

  function SortHead({ col, children }: { col?: string; children: React.ReactNode }) {
    const Icon = !col
      ? null
      : sort !== col
        ? ChevronsUpDown
        : dir === 'asc'
          ? ArrowUp
          : ArrowDown
    return (
      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {col ? (
          <button
            type="button"
            onClick={() => setSort(col)}
            className="inline-flex items-center gap-1 hover:text-white"
          >
            {children}
            {Icon && <Icon className="h-3 w-3" />}
          </button>
        ) : (
          children
        )}
      </th>
    )
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand/5 px-3 py-2">
          <span className="text-sm text-white">
            {t('selected', { count: selected.size })}
          </span>
          <button
            type="button"
            onClick={exportSelected}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-xs text-slate-200 hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" /> {t('export_csv')}
          </button>
          {canManage && (
            <>
              <select
                value={bulkPlan}
                onChange={(e) => setBulkPlan(e.target.value)}
                className="h-8 rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
              >
                <option value="">{t('change_plan_to')}</option>
                {plans
                  .filter((p) => p.is_active)
                  .map((p) => (
                    <option key={p.key} value={p.key}>
                      {locale === 'ru' ? p.name_ru : p.name_az}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!bulkPlan}
                onClick={() =>
                  start(async () => {
                    await bulkChangePlan(locale, ids, bulkPlan)
                    setSelected(new Set())
                    setBulkPlan('')
                  })
                }
                className="inline-flex h-8 items-center rounded-lg border border-white/15 px-2.5 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-40"
              >
                {t('apply')}
              </button>
              <button
                type="button"
                onClick={() =>
                  start(async () => {
                    await bulkSuspend(locale, ids)
                    setSelected(new Set())
                  })
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 text-xs text-[#F08C8C] hover:bg-red-500/10"
              >
                <Ban className="h-3.5 w-3.5" /> {t('suspend')}
              </button>
            </>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10 scroll-thin">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="w-10 px-3 py-3">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </th>
              <SortHead col="name">{t('col_name')}</SortHead>
              <SortHead col="plan_tier">{t('col_plan')}</SortHead>
              <SortHead>{t('col_health')}</SortHead>
              <SortHead>{t('col_mrr')}</SortHead>
              <SortHead col="created_at">{t('col_signup')}</SortHead>
              <SortHead col="last_active_at">{t('col_last_active')}</SortHead>
              <SortHead col="status">{t('col_status')}</SortHead>
              <SortHead>{t('col_payment')}</SortHead>
              <th className="w-12 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-2.5">
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={() => toggle(r.id)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/admin/tenants/${r.id}`}
                      className="font-medium text-white hover:text-brand"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-slate-300">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: r.planColor }}
                      />
                      {r.planLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <HealthBadge score={r.score} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-300">
                    {formatMoney(r.mrr)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">
                    {r.last_active_at
                      ? formatRelativeTime(r.last_active_at, locale)
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        STATUS_CLASS[r.status] ?? 'bg-slate-500/20 text-slate-400'
                      )}
                    >
                      {t(`status.${r.status}`)}
                    </span>
                  </td>
                  <td className={cn('px-3 py-2.5 text-xs font-medium', PAY_CLASS[r.paymentStatus] ?? 'text-slate-400')}>
                    {t(`payment.${r.paymentStatus}`)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <TenantControls
                      variant="menu"
                      tenant={{
                        id: r.id,
                        slug: r.slug,
                        name: r.name,
                        status: r.status,
                        plan_tier: r.plan_tier,
                      }}
                      locale={locale}
                      plans={plans}
                      canManage={canManage}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
