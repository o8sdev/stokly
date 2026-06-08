'use client'

import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import {
  updatePassword,
  type PasswordResetResult,
} from '@/lib/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function ResetPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const action = updatePassword.bind(null, locale)
  const [state, formAction] = useFormState<PasswordResetResult, FormData>(
    action,
    {}
  )

  const errorText =
    state.error === 'mismatch'
      ? t('auth.reset_mismatch')
      : state.error === 'weak'
        ? t('auth.reset_weak')
        : state.error === 'no_session'
          ? t('auth.reset_no_session')
          : t('auth.error_generic')

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">{t('auth.new_password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">{t('auth.confirm_password')}</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{errorText}</p>}
      <SubmitButton className="w-full" pendingText={t('common.loading')}>
        {t('auth.update_password')}
      </SubmitButton>
    </form>
  )
}
