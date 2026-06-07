'use client'

import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { signup, type AuthResult } from '../actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function SignupForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const action = signup.bind(null, locale)
  const [state, formAction] = useFormState<AuthResult, FormData>(action, {})

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="restaurant_name">{t('auth.restaurant_name')}</Label>
        <Input id="restaurant_name" name="restaurant_name" required />
      </div>
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
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      {state.error && (
        <p className="text-sm text-destructive">{t('auth.error_generic')}</p>
      )}
      <SubmitButton
        className="w-full"
        pendingText={t('common.loading')}
      >
        {t('auth.signup_button')}
      </SubmitButton>
    </form>
  )
}
