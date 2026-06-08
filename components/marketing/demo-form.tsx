'use client'

import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Check, ArrowRight } from 'lucide-react'
import {
  submitDemoRequest,
  type DemoResult,
} from '@/app/[locale]/(marketing)/actions'
import { SubmitButton } from '@/components/ui/submit-button'

// Persists the lead to Supabase (via the submit_demo_request RPC) and triggers
// a best-effort email alert. Shows a success state on completion.
export function DemoForm() {
  const t = useTranslations('landing.demo')
  const [state, formAction] = useFormState<DemoResult, FormData>(
    submitDemoRequest,
    {}
  )

  if (state.ok) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-brand/30 bg-brand/5 px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-[#04231A]">
          <Check className="h-6 w-6" />
        </div>
        <p className="text-lg font-semibold text-[#0d1b2a]">{t('success')}</p>
      </div>
    )
  }

  const field =
    'h-12 w-full rounded-xl border border-[#e2e8ee] bg-[#f8fafb] px-4 text-sm text-[#0d1b2a] placeholder:text-[#9aa7b4] transition-colors focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/12'

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          name="name"
          className={field}
          required
          placeholder={t('name')}
          aria-label={t('name')}
        />
        <input
          name="restaurant"
          className={field}
          placeholder={t('restaurant')}
          aria-label={t('restaurant')}
        />
      </div>
      <input
        name="email"
        type="email"
        className={field}
        required
        placeholder={t('email')}
        aria-label={t('email')}
      />
      <textarea
        name="message"
        className={field.replace('h-12', 'min-h-[96px] py-2.5')}
        placeholder={t('message')}
        aria-label={t('message')}
      />
      {state.error && (
        <p className="text-sm text-[#E53E3E]">{t('error')}</p>
      )}
      <SubmitButton
        pendingText={t('sending')}
        className="group h-12 w-full gap-2 rounded-xl"
      >
        {t('submit')}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </SubmitButton>
    </form>
  )
}
