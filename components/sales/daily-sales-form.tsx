'use client'

import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import {
  saveDailySales,
  type SalesResult,
} from '@/app/[locale]/app/(protected)/sales/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function DailySalesForm({
  locale,
  date,
  amount,
  note,
  lockDate,
}: {
  locale: string
  date: string
  amount?: number | null
  note?: string | null
  lockDate?: boolean
}) {
  const t = useTranslations()
  const action = saveDailySales.bind(null, locale)
  const [state, formAction] = useFormState<SalesResult, FormData>(action, {})

  return (
    <form action={formAction} className="stokly-card space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="sale_date">{t('sales.date')}</Label>
        <Input
          id="sale_date"
          name="sale_date"
          type="date"
          defaultValue={date}
          required
          readOnly={lockDate}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="total_amount">{t('sales.amount')}</Label>
        <Input
          id="total_amount"
          name="total_amount"
          type="number"
          step="0.01"
          min="0"
          defaultValue={amount ?? ''}
          placeholder="0.00"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">{t('sales.note')}</Label>
        <Input id="note" name="note" defaultValue={note ?? ''} />
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
