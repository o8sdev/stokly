'use client'

import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { loginAdmin, type AuthResult } from '@/lib/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function AdminLoginForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const action = loginAdmin.bind(null, locale)
  const [state, formAction] = useFormState<AuthResult, FormData>(action, {})

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-300">
          {t('auth.email')}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="border-white/15 bg-white/5 text-white placeholder:text-slate-500"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-300">
          {t('auth.password')}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="border-white/15 bg-white/5 text-white placeholder:text-slate-500"
        />
      </div>
      {state.error && (
        <p className="text-sm text-[#F08C8C]">
          {state.error === 'forbidden'
            ? t('auth.forbidden')
            : t('auth.error_invalid')}
        </p>
      )}
      <SubmitButton className="w-full" pendingText={t('common.loading')}>
        {t('auth.login_button')}
      </SubmitButton>
    </form>
  )
}
