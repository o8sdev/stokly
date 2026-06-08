'use client'

import * as React from 'react'
import { useFormState } from 'react-dom'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Copy, Check, X, Link2, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  FIELD,
  SELECT,
  LABEL,
  BTN_PRIMARY,
  BTN_GHOST,
} from './tenant-dialogs'
import {
  createInvitation,
  createBulkInvitations,
  revokeInvitation,
  type InviteResult,
} from '@/app/[locale]/admin/(console)/invitations/actions'
import { toCsv, downloadCsv } from '@/lib/admin/csv'
import { formatDate, cn } from '@/lib/utils'
import type { Plan } from '@/types/database'
import type { InvitationRow } from '@/lib/admin/queries'

const STATUS_CLASS: Record<string, string> = {
  unused: 'bg-sky-500/15 text-sky-300',
  redeemed: 'bg-emerald-500/15 text-emerald-300',
  revoked: 'bg-red-500/15 text-[#F08C8C]',
  expired: 'bg-slate-500/20 text-slate-400',
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="text-slate-400 hover:text-white"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function NewInviteDialog({ locale, plans }: { locale: string; plans: Plan[] }) {
  const t = useTranslations('admin.invitations')
  const [open, setOpen] = React.useState(false)
  const [state, action] = useFormState<InviteResult, FormData>(
    createInvitation.bind(null, locale),
    {}
  )
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className={BTN_PRIMARY}>
        <Plus className="h-4 w-4" /> {t('new')}
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('new')}</DialogTitle>
        </DialogHeader>
        {state.ok && state.code ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">{t('created_msg')}</p>
            <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2">
              <span className="flex-1 font-mono text-lg text-white">{state.code}</span>
              <CopyButton value={state.code} />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setOpen(false)} className={BTN_GHOST}>
                {t('close')}
              </button>
            </DialogFooter>
          </div>
        ) : (
          <form action={action} className="space-y-3">
            <div>
              <label className={LABEL}>{t('email_optional')}</label>
              <input name="email" type="email" className={FIELD} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>{t('plan')}</label>
                <select name="plan_key" defaultValue="trial" className={SELECT}>
                  {plans.map((p) => (
                    <option key={p.key} value={p.key}>
                      {locale === 'ru' ? p.name_ru : p.name_az}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>{t('expiry')}</label>
                <select name="expiry" defaultValue="30" className={SELECT}>
                  <option value="7">{t('expiry_7')}</option>
                  <option value="30">{t('expiry_30')}</option>
                  <option value="never">{t('expiry_never')}</option>
                </select>
              </div>
            </div>
            <div>
              <label className={LABEL}>{t('note')}</label>
              <input name="note" className={FIELD} />
            </div>
            <DialogFooter>
              <SubmitButton className="h-9">{t('generate')}</SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function BulkInviteDialog({ locale, plans }: { locale: string; plans: Plan[] }) {
  const t = useTranslations('admin.invitations')
  const [open, setOpen] = React.useState(false)
  const [count, setCount] = React.useState(10)
  const [plan, setPlan] = React.useState('trial')
  const [expiry, setExpiry] = React.useState('30')
  const [pending, start] = React.useTransition()

  function generate() {
    start(async () => {
      const { codes } = await createBulkInvitations(locale, count, plan, expiry)
      if (codes.length > 0) {
        downloadCsv(
          'stokly-invitations.csv',
          toCsv(codes.map((c) => ({ c })), [{ header: 'code', value: (r) => r.c }])
        )
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className={BTN_GHOST}>
        {t('bulk')}
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('bulk')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>{t('count')}</label>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className={FIELD + ' font-mono'}
            />
          </div>
          <div>
            <label className={LABEL}>{t('plan')}</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className={SELECT}>
              {plans.map((p) => (
                <option key={p.key} value={p.key}>
                  {locale === 'ru' ? p.name_ru : p.name_az}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>{t('expiry')}</label>
            <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className={SELECT}>
              <option value="7">{t('expiry_7')}</option>
              <option value="30">{t('expiry_30')}</option>
              <option value="never">{t('expiry_never')}</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={() => setOpen(false)} className={BTN_GHOST}>
            {t('close')}
          </button>
          <button type="button" disabled={pending} onClick={generate} className={BTN_PRIMARY}>
            {t('generate_csv')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function InvitationsClient({
  rows,
  plans,
  locale,
}: {
  rows: InvitationRow[]
  plans: Plan[]
  locale: string
}) {
  const t = useTranslations('admin.invitations')
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, start] = React.useTransition()
  const [origin, setOrigin] = React.useState('')
  React.useEffect(() => setOrigin(window.location.origin), [])

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              defaultValue={get('search')}
              onChange={(e) => update({ search: e.target.value || null })}
              placeholder={t('search')}
              className="h-9 w-48 rounded-lg border border-white/15 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-brand focus:outline-none"
            />
          </div>
          <select
            value={get('status')}
            onChange={(e) => update({ status: e.target.value || null })}
            className={SELECT}
          >
            <option value="">{t('all_status')}</option>
            {['unused', 'redeemed', 'revoked', 'expired'].map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
          <select
            value={get('plan')}
            onChange={(e) => update({ plan: e.target.value || null })}
            className={SELECT}
          >
            <option value="">{t('all_plans')}</option>
            {plans.map((p) => (
              <option key={p.key} value={p.key}>
                {locale === 'ru' ? p.name_ru : p.name_az}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <BulkInviteDialog locale={locale} plans={plans} />
          <NewInviteDialog locale={locale} plans={plans} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 scroll-thin">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-3 py-3 text-left font-semibold">{t('code')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('email')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('plan')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('col_status')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('created')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('expires')}</th>
              <th className="px-3 py-3 text-left font-semibold">{t('used_by')}</th>
              <th className="w-20 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="font-mono text-white">{r.code}</span>
                      <CopyButton value={r.code} />
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">{r.email ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-300">{r.plan_key}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        STATUS_CLASS[r.status]
                      )}
                    >
                      {t(`status.${r.status}`)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">{formatDate(r.created_at)}</td>
                  <td className="px-3 py-2.5 text-slate-400">
                    {r.expires_at ? formatDate(r.expires_at) : t('never')}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">{r.tenant_name ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title={t('copy_link')}
                        onClick={() =>
                          navigator.clipboard.writeText(
                            `${origin}/${locale}/app/login?invite=${r.code}`
                          )
                        }
                        className="text-slate-400 hover:text-white"
                      >
                        <Link2 className="h-4 w-4" />
                      </button>
                      {r.status === 'unused' && (
                        <button
                          type="button"
                          title={t('revoke')}
                          onClick={() => start(() => revokeInvitation(locale, r.id))}
                          className="text-slate-400 hover:text-[#F08C8C]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
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
