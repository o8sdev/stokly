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
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
        <span className="mk-stamp !rotate-[-4deg] text-[13px]">
          ✓ {t('success')}
        </span>
        <Check className="h-6 w-6 text-[#00926e]" />
      </div>
    )
  }

  const field =
    'h-12 w-full rounded-[4px] border border-[#ddd7c4] bg-[#fbfaf5] px-4 text-sm text-[#1c1a14] placeholder:text-[#8e8a7b] transition-colors focus:border-[#1c1a14] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C896]/25'

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
        <p className="text-sm text-[#c2462e]">{t('error')}</p>
      )}
      <SubmitButton
        pendingText={t('sending')}
        className="group h-12 w-full gap-2 rounded-[4px] bg-[#1c1a14] text-[#f4f1e8] hover:bg-[#00926e]"
      >
        {t('submit')}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </SubmitButton>
    </form>
  )
}
