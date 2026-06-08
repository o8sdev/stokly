'use client'

import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import {
  createBusiness,
  type CreateBusinessResult,
} from './actions'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function CreateBusinessForm({ locale }: { locale: string }) {
  const t = useTranslations('admin')
  const action = createBusiness.bind(null, locale)
  const [state, formAction] = useFormState<CreateBusinessResult, FormData>(
    action,
    {}
  )

  const field =
    'h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15'

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand/30 bg-brand/5 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-[#04231A]">
          <Check className="h-6 w-6" />
        </div>
        <p className="text-lg font-semibold">{t('business.created')}</p>
        <p className="max-w-sm text-sm text-slate-400">{t('business.hint')}</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="restaurant" className="text-slate-300">
          {t('business.restaurant')}
        </Label>
        <input id="restaurant" name="restaurant" required className={field} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-300">
          {t('business.email')}
        </Label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="off"
          className={field}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-300">
          {t('business.password')}
        </Label>
        <input
          id="password"
          name="password"
          type="text"
          required
          minLength={6}
          autoComplete="off"
          className={field}
        />
      </div>
      {state.error && (
        <p className="text-sm text-[#F08C8C]">
          {state.error === 'service_key'
            ? t('business.no_key')
            : t('business.error')}
        </p>
      )}
      <SubmitButton pendingText={t('business.create')}>
        {t('business.create')}
      </SubmitButton>
    </form>
  )
}
