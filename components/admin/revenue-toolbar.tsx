'use client'

import * as React from 'react'
import { useFormState } from 'react-dom'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Download, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { SubmitButton } from '@/components/ui/submit-button'
import { FIELD, SELECT, LABEL, BTN_PRIMARY, BTN_GHOST } from './tenant-dialogs'
import { recordPayment, type TenantActionResult } from '@/app/[locale]/admin/(console)/tenants/actions'
import { toCsv, downloadCsv } from '@/lib/admin/csv'
import { formatDate } from '@/lib/utils'
import type { Plan } from '@/types/database'
import type { PaymentRow } from '@/lib/admin/queries'

interface TenantOpt {
  id: string
  name: string
}

function RecordDialog({
  locale,
  tenants,
  plans,
}: {
  locale: string
  tenants: TenantOpt[]
  plans: Plan[]
}) {
  const t = useTranslations('admin.revenue')
  const [open, setOpen] = React.useState(false)
  const [state, action] = useFormState<TenantActionResult, FormData>(
    recordPayment.bind(null, locale),
    {}
  )
  React.useEffect(() => {
    if (state.ok) setOpen(false)
  }, [state.ok])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className={BTN_PRIMARY}>
        <Plus className="h-4 w-4" /> {t('record_payment')}
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('record_payment')}</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-3">
          <div>
            <label className={LABEL}>{t('tenant')}</label>
            <select name="tenant_id" required defaultValue="" className={SELECT}>
              <option value="" disabled>
                {t('select_tenant')}
              </option>
              {tenants.map((tn) => (
                <option key={tn.id} value={tn.id}>
                  {tn.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>{t('amount')}</label>
              <input name="amount" type="number" min="0" step="0.01" required className={FIELD + ' font-mono'} />
            </div>
            <div>
              <label className={LABEL}>{t('plan')}</label>
              <select name="plan_key" className={SELECT} defaultValue="professional">
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
            <button type="button" onClick={() => setOpen(false)} className={BTN_GHOST}>
              {t('cancel')}
            </button>
            <SubmitButton className="h-9">{t('save')}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RevenueToolbar({
  rows,
  tenants,
  plans,
  locale,
}: {
  rows: PaymentRow[]
  tenants: TenantOpt[]
  plans: Plan[]
  locale: string
}) {
  const t = useTranslations('admin.revenue')
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

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

  function exportCsv() {
    const csv = toCsv(rows, [
      { header: 'Date', value: (r) => formatDate(r.paid_at) },
      { header: 'Tenant', value: (r) => r.tenant_name ?? '' },
      { header: 'Plan', value: (r) => r.plan_key ?? '' },
      { header: 'Amount', value: (r) => r.amount },
      { header: 'Reference', value: (r) => r.reference ?? '' },
    ])
    downloadCsv('stokly-payments.csv', csv)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            defaultValue={get('search')}
            onChange={(e) => update({ search: e.target.value || null })}
            placeholder={t('search_tenant')}
            className="h-9 w-48 rounded-lg border border-white/15 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-brand focus:outline-none"
          />
        </div>
        <select value={get('plan')} onChange={(e) => update({ plan: e.target.value || null })} className={SELECT}>
          <option value="">{t('all_plans')}</option>
          {plans.map((p) => (
            <option key={p.key} value={p.key}>
              {locale === 'ru' ? p.name_ru : p.name_az}
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
      <div className="flex items-center gap-2">
        <button type="button" onClick={exportCsv} className={BTN_GHOST}>
          <Download className="mr-1.5 h-4 w-4" /> {t('export')}
        </button>
        <RecordDialog locale={locale} tenants={tenants} plans={plans} />
      </div>
    </div>
  )
}
