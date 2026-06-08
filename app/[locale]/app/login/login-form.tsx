'use client'

import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { loginBusiness, type AuthResult } from '@/lib/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function BusinessLoginForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const action = loginBusiness.bind(null, locale)
  const [state, formAction] = useFormState<AuthResult, FormData>(action, {})

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t('auth.email')}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t('auth.password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      {state.error && (
        <p className="text-sm text-destructive">{t('auth.error_invalid')}</p>
      )}
      <SubmitButton className="w-full" pendingText={t('common.loading')}>
        {t('auth.login_button')}
      </SubmitButton>
    </form>
  )
}
