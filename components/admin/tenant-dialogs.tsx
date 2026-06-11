'use client'

import * as React from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Copy, Check, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  changePlan,
  recordPayment,
  setTrialPeriod,
  addNote,
  resetTenantPassword,
  hardDeleteTenant,
  type TenantActionResult,
} from '@/app/[locale]/admin/(console)/tenants/actions'
import type { Plan } from '@/types/database'
import { formatDate } from '@/lib/utils'

export const FIELD =
  'h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:border-brand focus:outline-none'
export const SELECT =
  'h-10 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-sm text-white focus:border-brand focus:outline-none'
export const LABEL = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500'
export const BTN_PRIMARY =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-[#04231A] transition-colors hover:bg-brand-hover disabled:opacity-50'
export const BTN_GHOST =
  'inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-sm text-slate-300 transition-colors hover:bg-white/10'
export const BTN_DANGER =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-500/90 px-3 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50'

interface BaseProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  locale: string
  tenantId: string
}

export function ChangePlanDialog({
  open,
  onOpenChange,
  locale,
  tenantId,
  currentPlan,
  plans,
}: BaseProps & { currentPlan: string; plans: Plan[] }) {
  const t = useTranslations('admin.tenant_detail')
  const [plan, setPlan] = React.useState(currentPlan)
  const [pending, start] = React.useTransition()
  const active = plans.filter((p) => p.is_active)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('change_plan')}</DialogTitle>
        </DialogHeader>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className={SELECT}
        >
          {active.map((p) => (
            <option key={p.key} value={p.key}>
              {(locale === 'ru' ? p.name_ru : p.name_az)} — {p.monthly_price} AZN
            </option>
          ))}
        </select>
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={BTN_GHOST}>
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await changePlan(locale, tenantId, plan)
                onOpenChange(false)
              })
            }
            className={BTN_PRIMARY}
          >
            {t('apply')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  locale,
  tenantId,
  plans,
  defaultPlan,
}: BaseProps & { plans: Plan[]; defaultPlan: string }) {
  const t = useTranslations('admin.revenue')
  const [state, action] = useFormState<TenantActionResult, FormData>(
    recordPayment.bind(null, locale),
    {}
  )
  React.useEffect(() => {
    if (state.ok) onOpenChange(false)
  }, [state.ok, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('record_payment')}</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-3">
          <input type="hidden" name="tenant_id" value={tenantId} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>{t('amount')}</label>
              <input name="amount" type="number" min="0" step="0.01" required className={FIELD + ' font-mono'} />
            </div>
            <div>
              <label className={LABEL}>{t('plan')}</label>
              <select name="plan_key" defaultValue={defaultPlan} className={SELECT}>
                {plans.map((p) => (
                  <option key={p.key} value={p.key}>
                    {locale === 'ru' ? p.name_ru : p.name_az}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>{t('period_start')}</label>
              <input name="period_start" type="date" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>{t('period_end')}</label>
              <input name="period_end" type="date" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>{t('method')}</label>
              <select name="method" defaultValue="bank_transfer" className={SELECT}>
                <option value="bank_transfer">{t('bank_transfer')}</option>
                <option value="cash">{t('cash')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>{t('reference')}</label>
              <input name="reference" className={FIELD} />
            </div>
          </div>
          <div>
            <label className={LABEL}>{t('note')}</label>
            <input name="note" className={FIELD} />
          </div>
          {state.error && <p className="text-xs text-[#F08C8C]">{t('error')}</p>}
          <DialogFooter>
            <button type="button" onClick={() => onOpenChange(false)} className={BTN_GHOST}>
              {t('cancel')}
            </button>
            <SubmitButton className="h-9">{t('save')}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Set / extend / grant a trial: quick +14/+30, a custom day count, or an exact
// end date. The day and date inputs clear each other so exactly one is submitted;
// the action prefers the date. Doubles as "Grant trial" on a non-trial tenant.
export function TrialDialog({
  open,
  onOpenChange,
  locale,
  tenantId,
  currentEnd,
  isTrial,
}: BaseProps & { currentEnd: string | null; isTrial: boolean }) {
  const t = useTranslations('admin.tenant_detail')
  const [state, action] = useFormState<TenantActionResult, FormData>(
    setTrialPeriod.bind(null, locale),
    {}
  )
  const [days, setDays] = React.useState('14')
  const [endsAt, setEndsAt] = React.useState('')
  React.useEffect(() => {
    if (state.ok) onOpenChange(false)
  }, [state.ok, onOpenChange])

  const today = new Date().toISOString().slice(0, 10)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isTrial ? t('extend_trial') : t('grant_trial')}</DialogTitle>
          {currentEnd && (
            <DialogDescription>
              {t('trial_ends')}: {formatDate(currentEnd)}
            </DialogDescription>
          )}
        </DialogHeader>
        <form action={action} className="space-y-3">
          <input type="hidden" name="tenant_id" value={tenantId} />
          <div className="flex gap-2">
            {[14, 30].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setDays(String(n))
                  setEndsAt('')
                }}
                className={BTN_GHOST}
              >
                +{n}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>{t('trial_custom_days')}</label>
              <input
                name="days"
                type="number"
                min="1"
                value={days}
                onChange={(e) => {
                  setDays(e.target.value)
                  setEndsAt('')
                }}
                className={FIELD + ' font-mono'}
              />
            </div>
            <div>
              <label className={LABEL}>{t('trial_set_date')}</label>
              <input
                name="ends_at"
                type="date"
                min={today}
                value={endsAt}
                onChange={(e) => {
                  setEndsAt(e.target.value)
                  setDays('')
                }}
                className={FIELD}
              />
            </div>
          </div>
          {state.error && <p className="text-xs text-[#F08C8C]">{t('trial_error')}</p>}
          <DialogFooter>
            <button type="button" onClick={() => onOpenChange(false)} className={BTN_GHOST}>
              {t('cancel')}
            </button>
            <SubmitButton className="h-9">{t('apply')}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AddNoteDialog({
  open,
  onOpenChange,
  locale,
  tenantId,
}: BaseProps) {
  const t = useTranslations('admin.tenant_detail')
  const [state, action] = useFormState<TenantActionResult, FormData>(
    addNote.bind(null, locale),
    {}
  )
  React.useEffect(() => {
    if (state.ok) onOpenChange(false)
  }, [state.ok, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('add_note')}</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-3">
          <input type="hidden" name="tenant_id" value={tenantId} />
          <textarea
            name="body"
            required
            rows={4}
            className="w-full rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-white placeholder:text-slate-500 focus:border-brand focus:outline-none"
            placeholder={t('note_placeholder')}
          />
          {state.error && <p className="text-xs text-[#F08C8C]">{t('note_error')}</p>}
          <DialogFooter>
            <button type="button" onClick={() => onOpenChange(false)} className={BTN_GHOST}>
              {t('cancel')}
            </button>
            <SubmitButton className="h-9">{t('save')}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function PasswordResetDialog({
  open,
  onOpenChange,
  locale,
  tenantId,
}: BaseProps) {
  const t = useTranslations('admin.tenant_detail')
  const [pending, start] = React.useTransition()
  const [result, setResult] = React.useState<TenantActionResult | null>(null)
  const [copied, setCopied] = React.useState(false)

  function generate() {
    start(async () => {
      const r = await resetTenantPassword(locale, tenantId)
      setResult(r)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setResult(null)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('password_reset')}</DialogTitle>
          <DialogDescription>{t('password_reset_desc')}</DialogDescription>
        </DialogHeader>
        {result?.link ? (
          <div className="flex items-center gap-2">
            <input readOnly value={result.link} className={FIELD + ' font-mono text-xs'} />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(result.link ?? '')
                setCopied(true)
              }}
              className={BTN_GHOST}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        ) : result?.error ? (
          <p className="text-sm text-[#F08C8C]">
            {result.error === 'no_service_key' ? t('no_service_key') : t('reset_failed')}
          </p>
        ) : (
          <p className="text-sm text-slate-400">{t('password_reset_hint')}</p>
        )}
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={BTN_GHOST}>
            {t('close')}
          </button>
          {!result?.link && (
            <button type="button" disabled={pending} onClick={generate} className={BTN_PRIMARY}>
              {t('generate_link')}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  danger,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => Promise<void>
}) {
  const t = useTranslations('admin.tenant_detail')
  const [pending, start] = React.useTransition()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={BTN_GHOST}>
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => {
              await onConfirm()
              onOpenChange(false)
            })}
            className={danger ? BTN_DANGER : BTN_PRIMARY}
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function HardDeleteDialog({
  open,
  onOpenChange,
  locale,
  tenantId,
  slug,
}: BaseProps & { slug: string }) {
  const t = useTranslations('admin.tenant_detail')
  const [value, setValue] = React.useState('')
  const [pending, start] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#F08C8C]">
            <AlertTriangle className="h-5 w-5" />
            {t('hard_delete')}
          </DialogTitle>
          <DialogDescription>{t('hard_delete_desc', { slug })}</DialogDescription>
        </DialogHeader>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={slug}
          className={FIELD + ' font-mono'}
        />
        {error && <p className="text-xs text-[#F08C8C]">{t(error === 'mismatch' ? 'slug_mismatch' : 'reset_failed')}</p>}
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={BTN_GHOST}>
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={pending || value.trim() !== slug}
            onClick={() =>
              start(async () => {
                const r = await hardDeleteTenant(locale, tenantId, value)
                if (r?.error) setError(r.error)
              })
            }
            className={BTN_DANGER}
          >
            {t('hard_delete_confirm')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
