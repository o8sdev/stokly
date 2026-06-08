'use client'

import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import {
  requestPasswordReset,
  type PasswordResetResult,
} from '@/lib/auth/actions'
import { Link } from '@/lib/i18n/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function ForgotPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const action = requestPasswordReset.bind(null, locale)
  const [state, formAction] = useFormState<PasswordResetResult, FormData>(
    action,
    {}
  )

  if (state.success) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{t('auth.reset_sent')}</p>
        <Link
          href="/app/login"
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          {t('auth.back_to_login')}
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('auth.forgot_subtitle')}
      </p>
      <div className="space-y-2">
        <Label htmlFor="email">{t('auth.email')}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      {state.error && (
        <p className="text-sm text-destructive">{t('auth.error_generic')}</p>
      )}
      <SubmitButton className="w-full" pendingText={t('common.loading')}>
        {t('auth.send_reset_link')}
      </SubmitButton>
      <div className="text-center">
        <Link
          href="/app/login"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t('auth.back_to_login')}
        </Link>
      </div>
    </form>
  )
}
