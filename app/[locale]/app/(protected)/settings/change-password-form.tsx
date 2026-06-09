'use client'

import { useEffect, useRef } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { changePassword, type PasswordResetResult } from '@/lib/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function ChangePasswordForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const formRef = useRef<HTMLFormElement>(null)
  const action = changePassword.bind(null, locale)
  const [state, formAction] = useFormState<PasswordResetResult, FormData>(
    action,
    {}
  )

  // Clear the fields after a successful change.
  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  const errorText =
    state.error === 'mismatch'
      ? t('auth.reset_mismatch')
      : state.error === 'weak'
        ? t('settings.password_weak')
        : state.error === 'no_session'
          ? t('auth.reset_no_session')
          : t('auth.error_generic')

  return (
    <form ref={formRef} action={formAction} className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">{t('settings.new_password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">{t('settings.confirm_password')}</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{errorText}</p>}
      {state.success && (
        <p className="text-sm text-green-600">
          {t('settings.password_changed')} ✓
        </p>
      )}

      <SubmitButton pendingText={t('common.saving')}>
        {t('settings.change_password')}
      </SubmitButton>
    </form>
  )
}
