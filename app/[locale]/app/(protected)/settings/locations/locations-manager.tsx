'use client'

import { useRef, useEffect, useState } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Trash2, Utensils, Star, Truck, Snowflake, Check } from 'lucide-react'
import type { StorageLocation } from '@/types/database'
import {
  createLocation,
  renameLocation,
  deleteLocation,
  setConsumptionPoint,
  setDefaultConsumptionLocation,
  setDefaultReceivingLocation,
  setLocationKind,
  setLocationFrozen,
  type SettingsResult,
} from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import { cn } from '@/lib/utils'
import { LOCATION_KINDS, LOCATION_PRESETS } from '@/lib/constants/locations'

const chip =
  'inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors'
const chipOn = 'border-primary bg-primary/10 text-primary'
const chipOff = 'border-border text-muted-foreground hover:bg-secondary'
const selectCls =
  'h-9 rounded-md border border-input bg-card px-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15'

export function LocationsManager({
  locale,
  locations,
  usedIds,
  multiLocation,
}: {
  locale: string
  locations: StorageLocation[]
  usedIds: string[]
  multiLocation: boolean
}) {
  const t = useTranslations()
  const formRef = useRef<HTMLFormElement>(null)
  const action = createLocation.bind(null, locale)
  const [state, formAction] = useFormState<SettingsResult, FormData>(action, {})

  const [addName, setAddName] = useState('')
  const [addKind, setAddKind] = useState<string>('storage')

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      setAddName('')
      setAddKind('storage')
    }
  }, [state.success])

  const used = new Set(usedIds)
  const consumptionCount = locations.filter((l) => l.is_consumption_point).length

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-2">
        {locations.map((l) => {
          const canDelete =
            !l.is_default_consumption && !l.is_default_receiving && !used.has(l.id)
          // Can't turn the default off; turning a 2nd+ point ON needs the feature.
          const cpDisabled = l.is_consumption_point
            ? l.is_default_consumption
            : consumptionCount >= 1 && !multiLocation
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

              {/* Kind */}
              <form action={setLocationKind.bind(null, locale, l.id)}>
                <select
                  name="kind"
                  defaultValue={l.kind ?? 'storage'}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  aria-label={t('locations.kind')}
                  className={selectCls}
                >
                  {LOCATION_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {t(`locations.kind_${k}`)}
                    </option>
                  ))}
                </select>
              </form>

              {/* Consumption point */}
              <form
                action={setConsumptionPoint.bind(
                  null,
                  locale,
                  l.id,
                  !l.is_consumption_point
                )}
              >
                <button
                  type="submit"
                  disabled={cpDisabled}
                  className={cn(
                    chip,
                    l.is_consumption_point ? chipOn : chipOff,
                    cpDisabled && 'opacity-50'
                  )}
                  title={
                    cpDisabled && !l.is_consumption_point
                      ? t('locations.requires_multi_location')
                      : t('locations.consumption_hint')
                  }
                >
                  <Utensils className="h-3.5 w-3.5" />
                  {t('locations.consumption_point')}
                </button>
              </form>

              {/* Default consumption */}
              <form action={setDefaultConsumptionLocation.bind(null, locale, l.id)}>
                <button
                  type="submit"
                  disabled={l.is_default_consumption}
                  className={cn(
                    chip,
                    l.is_default_consumption ? chipOn : chipOff
                  )}
                  title={t('locations.default_consumption_hint')}
                >
                  <Star className="h-3.5 w-3.5" />
                  {t('locations.default_consumption')}
                </button>
              </form>

              {/* Default receiving */}
              <form action={setDefaultReceivingLocation.bind(null, locale, l.id)}>
                <button
                  type="submit"
                  disabled={l.is_default_receiving}
                  className={cn(chip, l.is_default_receiving ? chipOn : chipOff)}
                  title={t('locations.receiving_hint')}
                >
                  <Truck className="h-3.5 w-3.5" />
                  {t('locations.receiving')}
                </button>
              </form>

              {/* Frozen */}
              <form action={setLocationFrozen.bind(null, locale, l.id, !l.is_frozen)}>
                <button
                  type="submit"
                  className={cn(
                    chip,
                    l.is_frozen
                      ? 'border-sky-500/40 bg-sky-500/10 text-sky-600'
                      : chipOff
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
                  <Button type="submit" variant="ghost" size="icon" aria-label={t('common.delete')}>
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

        {/* Presets */}
        <div className="flex flex-wrap gap-1.5">
          {LOCATION_PRESETS.map((p) => (
            <button
              key={p.kind}
              type="button"
              onClick={() => {
                setAddName(t(`locations.${p.nameKey}`))
                setAddKind(p.kind)
              }}
              className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              + {t(`locations.kind_${p.kind}`)}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">{t('locations.name')}</Label>
          <Input
            id="name"
            name="name"
            required
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder={t('locations.name_ph')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kind">{t('locations.kind')}</Label>
          <select
            id="kind"
            name="kind"
            value={addKind}
            onChange={(e) => setAddKind(e.target.value)}
            className={cn(selectCls, 'h-[38px] w-full')}
          >
            {LOCATION_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`locations.kind_${k}`)}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_frozen" className="h-4 w-4 accent-sky-500" />
          {t('locations.frozen_label')}
        </label>
        {state.error && <p className="text-sm text-destructive">{t('common.error')}</p>}
        <SubmitButton pendingText={t('common.saving')} className="w-full">
          {t('common.add')}
        </SubmitButton>
      </form>
    </div>
  )
}
