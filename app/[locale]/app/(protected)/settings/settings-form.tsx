'use client'

import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import type { Tenant } from '@/types/database'
import { updateTenant, type SettingsResult } from './actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function SettingsForm({
  locale,
  tenant,
}: {
  locale: string
  tenant: Tenant
}) {
  const t = useTranslations()
  const action = updateTenant.bind(null, locale)
  const [state, formAction] = useFormState<SettingsResult, FormData>(
    action,
    {}
  )

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">{t('settings.restaurant_name')}</Label>
        <Input id="name" name="name" defaultValue={tenant.name} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currency">{t('settings.currency')}</Label>
          <Input
            id="currency"
            name="currency"
            defaultValue={tenant.currency}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="locale">{t('settings.locale')}</Label>
          <select
            id="locale"
            name="locale"
            defaultValue={tenant.locale}
            className="flex h-[38px] w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
          >
            <option value="az">Azərbaycanca</option>
            <option value="ru">Русский</option>
          </select>
        </div>
      </div>

      <div className="max-w-[14rem] space-y-2">
        <Label htmlFor="count_cycle_days">{t('settings.count_cycle_days')}</Label>
        <Input
          id="count_cycle_days"
          name="count_cycle_days"
          type="number"
          min="1"
          max="365"
          defaultValue={tenant.count_cycle_days}
          required
        />
        <p className="text-xs text-muted-foreground">
          {t('settings.count_cycle_days_hint')}
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{t('common.error')}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-600">{t('common.save')} ✓</p>
      )}

      <SubmitButton pendingText={t('common.saving')}>
        {t('common.save')}
      </SubmitButton>
    </form>
  )
}
