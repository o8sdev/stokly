'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ArrowRight } from 'lucide-react'

// Front-end-only demo request. Not wired to a backend yet — on submit it shows
// a success state. Hook this up to a Supabase table or email endpoint later.
export function DemoForm() {
  const t = useTranslations('landing.demo')
  const [sent, setSent] = useState(false)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-brand/30 bg-brand/5 px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-[#04231A]">
          <Check className="h-6 w-6" />
        </div>
        <p className="text-lg font-semibold text-white">{t('success')}</p>
      </div>
    )
  }

  const field =
    'h-11 w-full rounded-lg border border-white/12 bg-white/5 px-3.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15'

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input className={field} required placeholder={t('name')} aria-label={t('name')} />
        <input className={field} required placeholder={t('restaurant')} aria-label={t('restaurant')} />
      </div>
      <input
        type="email"
        className={field}
        required
        placeholder={t('email')}
        aria-label={t('email')}
      />
      <textarea
        className={field.replace('h-11', 'min-h-[96px] py-2.5')}
        placeholder={t('message')}
        aria-label={t('message')}
      />
      <button
        type="submit"
        className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-[#04231A] transition-colors hover:bg-brand-hover"
      >
        {t('submit')}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </form>
  )
}
