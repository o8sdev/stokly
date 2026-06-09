'use client'

import { useFormState } from 'react-dom'
import { useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { addLibraryItem, type LibraryResult } from './actions'
import { SubmitButton } from '@/components/ui/submit-button'
import { BUSINESS_TYPES } from '@/lib/constants/business-types'

export function LibraryAddForm({ locale }: { locale: string }) {
  const t = useTranslations('admin.library')
  const tb = useTranslations('business_type')
  const formRef = useRef<HTMLFormElement>(null)
  const action = addLibraryItem.bind(null, locale)
  const [state, formAction] = useFormState<LibraryResult, FormData>(action, {})

  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state.ok])

  const field =
    'h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:border-brand focus:outline-none'

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <input name="name_az" required placeholder={t('name_az')} className={field} />
        <input name="name_ru" placeholder={t('name_ru')} className={field} />
        <input name="category" required placeholder={t('category')} className={field} />
        <input name="default_unit" required placeholder={t('unit')} className={field} />
        <input
          name="yield"
          type="number"
          min="1"
          max="100"
          defaultValue={100}
          placeholder={t('yield')}
          className={field + ' font-mono'}
        />
        <label className="flex h-10 items-center gap-2 px-1 text-xs text-slate-300">
          <input type="checkbox" name="is_common" className="h-4 w-4 accent-brand" />
          {t('common')}
        </label>
      </div>

      {/* Business types this item suits — none ticked = shown to all tenants. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs font-medium text-slate-400">
          {t('business_types')}:
        </span>
        {BUSINESS_TYPES.map((b) => (
          <label
            key={b.key}
            className="flex items-center gap-1.5 text-xs text-slate-300"
          >
            <input
              type="checkbox"
              name="business_types"
              value={b.key}
              className="h-3.5 w-3.5 accent-brand"
            />
            {tb(b.key)}
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <SubmitButton className="h-10 gap-1.5">
          <Plus className="h-4 w-4" />
          {t('add')}
        </SubmitButton>
      </div>
    </form>
  )
}
