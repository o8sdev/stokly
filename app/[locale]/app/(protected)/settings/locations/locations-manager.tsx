'use client'

import { useRef, useEffect } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Trash2, ChefHat, Truck, Snowflake, Check } from 'lucide-react'
import type { StorageLocation } from '@/types/database'
import {
  createLocation,
  renameLocation,
  deleteLocation,
  setKitchenLocation,
  setDefaultReceivingLocation,
  setLocationFrozen,
  type SettingsResult,
} from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import { cn } from '@/lib/utils'

export function LocationsManager({
  locale,
  locations,
  usedIds,
}: {
  locale: string
  locations: StorageLocation[]
  usedIds: string[]
}) {
  const t = useTranslations()
  const formRef = useRef<HTMLFormElement>(null)
  const action = createLocation.bind(null, locale)
  const [state, formAction] = useFormState<SettingsResult, FormData>(action, {})

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  const used = new Set(usedIds)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-2">
        {locations.map((l) => {
          const canDelete =
            !l.is_kitchen && !l.is_default_receiving && !used.has(l.id)
          return (
            <div
              key={l.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3"
            >
              {/* Rename */}
              <form
                action={renameLocation.bind(null, locale, l.id)}
                className="flex min-w-0 flex-1 items-center gap-1.5"
              >
                <Input
                  name="name"
                  defaultValue={l.name}
                  className="h-9 min-w-0 flex-1"
                  aria-label={t('locations.name')}
                />
                <Button type="submit" variant="ghost" size="icon" aria-label={t('common.save')}>
                  <Check className="h-4 w-4" />
                </Button>
              </form>

              {/* Kitchen */}
              <form action={setKitchenLocation.bind(null, locale, l.id)}>
                <button
                  type="submit"
                  disabled={l.is_kitchen}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                    l.is_kitchen
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-secondary'
                  )}
                  title={t('locations.kitchen_hint')}
                >
                  <ChefHat className="h-3.5 w-3.5" />
                  {t('locations.kitchen')}
                </button>
              </form>

              {/* Default receiving */}
              <form action={setDefaultReceivingLocation.bind(null, locale, l.id)}>
                <button
                  type="submit"
                  disabled={l.is_default_receiving}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                    l.is_default_receiving
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-secondary'
                  )}
                  title={t('locations.receiving_hint')}
                >
                  <Truck className="h-3.5 w-3.5" />
                  {t('locations.receiving')}
                </button>
              </form>

              {/* Frozen toggle */}
              <form action={setLocationFrozen.bind(null, locale, l.id, !l.is_frozen)}>
                <button
                  type="submit"
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                    l.is_frozen
                      ? 'border-sky-500/40 bg-sky-500/10 text-sky-600'
                      : 'border-border text-muted-foreground hover:bg-secondary'
                  )}
                  title={t('locations.frozen_hint')}
                >
                  <Snowflake className="h-3.5 w-3.5" />
                  {t('locations.frozen')}
                </button>
              </form>

              {/* Delete */}
              {canDelete ? (
                <form action={deleteLocation.bind(null, locale, l.id)}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </form>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled
                  title={t('locations.cannot_delete')}
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4 opacity-30" />
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <form ref={formRef} action={formAction} className="space-y-4 stokly-card p-5">
        <h2 className="font-semibold">{t('locations.add')}</h2>
        <div className="space-y-2">
          <Label htmlFor="name">{t('locations.name')}</Label>
          <Input id="name" name="name" required placeholder={t('locations.name_ph')} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_frozen" className="h-4 w-4 accent-sky-500" />
          {t('locations.frozen_label')}
        </label>
        {state.error && (
          <p className="text-sm text-destructive">{t('common.error')}</p>
        )}
        <SubmitButton pendingText={t('common.saving')} className="w-full">
          {t('common.add')}
        </SubmitButton>
      </form>
    </div>
  )
}
