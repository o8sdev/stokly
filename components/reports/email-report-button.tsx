'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Mail, Loader2, Check } from 'lucide-react'
import { emailPeriodReport } from '@/app/[locale]/app/(protected)/reports/period/actions'
import { Button } from '@/components/ui/button'

// "Send to my e-mail" — the owner gets the period results in their inbox even
// when managers run the dashboard day to day.
export function EmailReportButton({
  locale,
  periodId,
}: {
  locale: string
  periodId: string
}) {
  const t = useTranslations('report_period')
  const [pending, start] = useTransition()
  const [state, setState] = useState<'idle' | 'ok' | 'error' | 'unconfigured'>(
    'idle'
  )

  function send() {
    setState('idle')
    start(async () => {
      const res = await emailPeriodReport(locale, periodId)
      setState(res.ok ? 'ok' : res.error === 'not_configured' ? 'unconfigured' : 'error')
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={send}
        disabled={pending}
        className="gap-2"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === 'ok' ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        {pending
          ? t('email_sending')
          : state === 'ok'
            ? t('email_sent')
            : t('email_send')}
      </Button>
      {state === 'error' && (
        <span className="text-xs text-destructive">{t('email_error')}</span>
      )}
      {state === 'unconfigured' && (
        <span className="text-xs text-muted-foreground">
          {t('email_not_configured')}
        </span>
      )}
    </div>
  )
}
