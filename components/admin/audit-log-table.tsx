'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronRight, Download, Search } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { SELECT } from './tenant-dialogs'
import { toCsv, downloadCsv } from '@/lib/admin/csv'
import { cn } from '@/lib/utils'
import type { AuditRow } from '@/lib/admin/queries'

const ACTIONS = [
  'tenant_impersonated',
  'impersonation_ended',
  'plan_changed',
  'trial_extended',
  'account_suspended',
  'account_reactivated',
  'account_deleted',
  'account_hard_deleted',
  'payment_recorded',
  'note_added',
  'nudge_sent',
  'password_reset',
  'tenant_exported',
  'invite_created',
  'invite_revoked',
  'business_created',
  'plan_edited',
  'feature_flag_changed',
  'demo_status_updated',
  'blog_post_created',
  'blog_post_updated',
  'blog_post_deleted',
  'blog_post_published',
  'library_item_added',
  'library_item_removed',
  'library_item_updated',
  'admin_added',
  'admin_removed',
]

function fmt(ts: string): string {
  return new Date(ts).toLocaleString()
}

export function AuditLogTable({ rows }: { rows: AuditRow[] }) {
  const t = useTranslations('admin.logs')
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    next.delete('page')
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }
  const get = (k: string) => params.get(k) ?? ''

  function toggle(id: string) {
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function exportCsv() {
    const csv = toCsv(rows, [
      { header: 'Time', value: (r) => fmt(r.created_at) },
      { header: 'Admin', value: (r) => r.actor_email ?? '' },
      { header: 'Action', value: (r) => r.action },
      { header: 'Tenant', value: (r) => r.tenant_name ?? '' },
      { header: 'Details', value: (r) => JSON.stringify(r.details) },
    ])
    downloadCsv('stokly-audit-log.csv', csv)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              defaultValue={get('actor')}
              onChange={(e) => update({ actor: e.target.value || null })}
              placeholder={t('search_admin')}
              className="h-9 w-44 rounded-lg border border-white/15 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-brand focus:outline-none"
            />
          </div>
          <select value={get('action')} onChange={(e) => update({ action: e.target.value || null })} className={SELECT}>
            <option value="">{t('all_actions')}</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={get('from')}
            onChange={(e) => update({ from: e.target.value || null })}
            className={SELECT}
          />
          <span className="text-slate-600">→</span>
          <input
            type="date"
            value={get('to')}
            onChange={(e) => update({ to: e.target.value || null })}
            className={SELECT}
          />
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-sm text-slate-300 hover:bg-white/10"
        >
          <Download className="h-4 w-4" /> {t('export')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 scroll-thin">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-400">
              <th className="w-8 px-3 py-3" />
              <th className="px-3 py-3 text-left font-semibold">{t('col_time')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('col_admin')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('col_action')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('col_tenant')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isOpen = expanded.has(r.id)
                const hasDetails =
                  r.details && Object.keys(r.details as object).length > 0
                return (
                  <React.Fragment key={r.id}>
                    <tr className="border-b border-white/[0.06] last:border-0">
                      <td className="px-3 py-2.5">
                        {hasDetails && (
                          <button
                            type="button"
                            onClick={() => toggle(r.id)}
                            className="text-slate-400 hover:text-white"
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-400">
                        {fmt(r.created_at)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">{r.actor_email ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                          {r.action}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {r.target_tenant_id ? (
                          <Link
                            href={`/admin/tenants/${r.target_tenant_id}`}
                            className="text-slate-300 hover:text-brand"
                          >
                            {r.tenant_name ?? r.target_tenant_id.slice(0, 8)}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className={cn('bg-black/20')}>
                        <td />
                        <td colSpan={4} className="px-3 py-2.5">
                          <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-xs text-slate-300 scroll-thin">
                            {JSON.stringify(r.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
