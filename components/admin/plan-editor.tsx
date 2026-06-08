'use client'

import * as React from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Plus, Check } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { planColor } from '@/lib/admin/plan-utils'
import {
  updatePlan,
  setPlanActive,
  createPlan,
  type PlanResult,
} from '@/app/[locale]/admin/(console)/plans/actions'
import type { Plan } from '@/types/database'

const FIELD =
  'h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:border-brand focus:outline-none disabled:opacity-50'
const LABEL = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500'

export function PlanEditorCard({
  plan,
  locale,
  canEdit,
}: {
  plan: Plan
  locale: string
  canEdit: boolean
}) {
  const t = useTranslations('admin.plans')
  const [state, formAction] = useFormState<PlanResult, FormData>(
    updatePlan.bind(null, locale),
    {}
  )
  const [active, setActive] = React.useState(plan.is_active)
  const [, startTransition] = React.useTransition()

  function toggleActive(next: boolean) {
    setActive(next)
    startTransition(() => setPlanActive(locale, plan.key, next))
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <input type="hidden" name="key" value={plan.key} />
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: planColor(plan.key) }}
          />
          <span className="font-mono text-xs uppercase tracking-wide text-slate-400">
            {plan.key}
          </span>
        </span>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          {active ? t('active') : t('inactive')}
          <Switch
            checked={active}
            onCheckedChange={toggleActive}
            disabled={!canEdit || plan.is_trial}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>{t('name_az')}</label>
          <input name="name_az" defaultValue={plan.name_az} required disabled={!canEdit} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>{t('name_ru')}</label>
          <input name="name_ru" defaultValue={plan.name_ru} required disabled={!canEdit} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>{t('price')}</label>
          <input
            name="monthly_price"
            type="number"
            min="0"
            step="1"
            defaultValue={plan.monthly_price}
            disabled={!canEdit}
            className={FIELD + ' font-mono'}
          />
        </div>
        <div className="flex items-end">
          <span className="text-[11px] text-slate-500">{t('per_month')}</span>
        </div>
        <div className="col-span-2">
          <label className={LABEL}>{t('desc_az')}</label>
          <input name="description_az" defaultValue={plan.description_az ?? ''} disabled={!canEdit} className={FIELD} />
        </div>
        <div className="col-span-2">
          <label className={LABEL}>{t('desc_ru')}</label>
          <input name="description_ru" defaultValue={plan.description_ru ?? ''} disabled={!canEdit} className={FIELD} />
        </div>
      </div>

      {canEdit && (
        <div className="mt-3 flex items-center justify-end gap-3">
          {state.ok && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check className="h-3.5 w-3.5" /> {t('saved')}
            </span>
          )}
          {state.error && (
            <span className="text-xs text-[#F08C8C]">{t('save_error')}</span>
          )}
          <SubmitButton className="h-9">{t('save')}</SubmitButton>
        </div>
      )}
    </form>
  )
}

export function CreatePlanDialog({ locale }: { locale: string }) {
  const t = useTranslations('admin.plans')
  const [open, setOpen] = React.useState(false)
  const [state, formAction] = useFormState<PlanResult, FormData>(
    createPlan.bind(null, locale),
    {}
  )

  React.useEffect(() => {
    if (state.ok) setOpen(false)
  }, [state.ok])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-[#04231A] transition-colors hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" />
          {t('add_plan')}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('add_plan')}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div>
            <label className={LABEL}>{t('key')}</label>
            <input name="key" required placeholder="growth_plus" className={FIELD + ' font-mono'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>{t('name_az')}</label>
              <input name="name_az" required className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>{t('name_ru')}</label>
              <input name="name_ru" required className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>{t('price')}</label>
              <input name="monthly_price" type="number" min="0" defaultValue={0} className={FIELD + ' font-mono'} />
            </div>
            <div>
              <label className={LABEL}>{t('sort_order')}</label>
              <input name="sort_order" type="number" defaultValue={5} className={FIELD + ' font-mono'} />
            </div>
          </div>
          {state.error && (
            <p className="text-xs text-[#F08C8C]">
              {state.error === 'duplicate' ? t('duplicate') : t('save_error')}
            </p>
          )}
          <div className="flex justify-end">
            <SubmitButton className="h-9">{t('create')}</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
