'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { MessageCircle, Eye, StickyNote, Check } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { AddNoteDialog } from './tenant-dialogs'
import { sendNudge } from '@/app/[locale]/admin/(console)/onboarding/actions'
import { MILESTONE_COUNT, type MilestoneKey } from '@/lib/admin/onboarding-constants'
import { formatRelativeTime } from '@/lib/utils'

export interface OnbRow {
  id: string
  name: string
  daysInTrial: number
  completedCount: number
  currentStep: MilestoneKey | null
  stuckDays: number | null
  lastLogin: string | null
}

export function OnboardingTable({
  rows,
  locale,
}: {
  rows: OnbRow[]
  locale: string
}) {
  const t = useTranslations('admin.onboarding')
  const [, start] = React.useTransition()
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [noteFor, setNoteFor] = React.useState<string | null>(null)

  function nudge(row: OnbRow) {
    const text = row.currentStep ? t(`nudges.${row.currentStep}`) : ''
    if (text) navigator.clipboard.writeText(text)
    setCopiedId(row.id)
    setTimeout(() => setCopiedId(null), 1500)
    start(() => sendNudge(locale, row.id, row.currentStep ?? 'done'))
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-white/10 scroll-thin">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-3 py-3 text-left font-semibold">{t('col_tenant')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('col_days')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('col_progress')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('col_step')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('col_stuck')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('col_last_login')}</th>
              <th className="w-28 px-3 py-3" />
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
              rows.map((r) => {
                const pct = Math.round((r.completedCount / MILESTONE_COUNT) * 100)
                const done = r.completedCount === MILESTONE_COUNT
                return (
                  <tr key={r.id} className="border-b border-white/[0.06] last:border-0">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/admin/tenants/${r.id}`}
                        className="font-medium text-white hover:text-brand"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-300">{r.daysInTrial}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={done ? 'h-full bg-emerald-400' : 'h-full bg-brand'}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-slate-400">
                          {r.completedCount}/{MILESTONE_COUNT}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {done ? (
                        <span className="text-emerald-300">{t('completed')}</span>
                      ) : r.currentStep ? (
                        t(`steps.${r.currentStep}`)
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.stuckDays !== null ? (
                        <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-medium text-orange-300">
                          {r.stuckDays} {t('days')}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">
                      {r.lastLogin ? formatRelativeTime(r.lastLogin, locale) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {!done && (
                          <button
                            type="button"
                            title={t('nudge')}
                            onClick={() => nudge(r)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
                          >
                            {copiedId === r.id ? (
                              <Check className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <MessageCircle className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <Link
                          href={`/admin/tenants/${r.id}`}
                          title={t('view')}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          title={t('note')}
                          onClick={() => setNoteFor(r.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
                        >
                          <StickyNote className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {noteFor && (
        <AddNoteDialog
          open={!!noteFor}
          onOpenChange={(o) => setNoteFor(o ? noteFor : null)}
          locale={locale}
          tenantId={noteFor}
        />
      )}
    </>
  )
}
