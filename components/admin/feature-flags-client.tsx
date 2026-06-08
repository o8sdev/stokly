'use client'

import * as React from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { X, Plus } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  setFeatureGlobal,
  addOverride,
  removeOverride,
  type OverrideResult,
} from '@/app/[locale]/admin/(console)/feature-flags/actions'
import type { Feature } from '@/types/database'
import type { TenantOverrideRow } from '@/lib/admin/entitlements'

interface TenantOpt {
  id: string
  name: string
}

const SELECT =
  'h-9 rounded-lg border border-white/15 bg-white/5 px-2 text-sm text-white focus:border-brand focus:outline-none'

function GlobalSwitch({
  feature,
  locale,
  canEdit,
}: {
  feature: Feature
  locale: string
  canEdit: boolean
}) {
  const [on, setOn] = React.useState(feature.global_enabled)
  const [, start] = React.useTransition()
  return (
    <Switch
      checked={on}
      disabled={!canEdit}
      onCheckedChange={(v) => {
        setOn(v)
        start(() => setFeatureGlobal(locale, feature.key, v))
      }}
    />
  )
}

function AddOverrideForm({
  featureKey,
  tenants,
  locale,
}: {
  featureKey: string
  tenants: TenantOpt[]
  locale: string
}) {
  const t = useTranslations('admin.flags')
  const [state, action] = useFormState<OverrideResult, FormData>(
    addOverride.bind(null, locale),
    {}
  )
  const ref = React.useRef<HTMLFormElement>(null)
  React.useEffect(() => {
    if (state.ok) ref.current?.reset()
  }, [state.ok])

  return (
    <form ref={ref} action={action} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="hidden" name="feature_key" value={featureKey} />
      <select name="tenant_id" required defaultValue="" className={SELECT}>
        <option value="" disabled>
          {t('select_tenant')}
        </option>
        {tenants.map((tn) => (
          <option key={tn.id} value={tn.id}>
            {tn.name}
          </option>
        ))}
      </select>
      <select name="enabled" defaultValue="true" className={SELECT}>
        <option value="true">{t('grant')}</option>
        <option value="false">{t('deny')}</option>
      </select>
      <SubmitButton className="h-9 gap-1.5">
        <Plus className="h-4 w-4" />
        {t('add_override')}
      </SubmitButton>
    </form>
  )
}

export function FeatureFlagsClient({
  features,
  overrides,
  tenants,
  locale,
  canEdit,
}: {
  features: Feature[]
  overrides: TenantOverrideRow[]
  tenants: TenantOpt[]
  locale: string
  canEdit: boolean
}) {
  const t = useTranslations('admin.flags')
  const [, start] = React.useTransition()

  return (
    <div className="space-y-4">
      {features.map((f) => {
        const ov = overrides.filter((o) => o.feature_key === f.key)
        return (
          <div
            key={f.key}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-white">
                  {locale === 'ru' ? f.name_ru : f.name_az}
                </p>
                <p className="font-mono text-[11px] text-slate-500">{f.key}</p>
                {(locale === 'ru' ? f.description_ru : f.description_az) && (
                  <p className="mt-1 text-sm text-slate-400">
                    {locale === 'ru' ? f.description_ru : f.description_az}
                  </p>
                )}
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                {f.global_enabled ? t('on') : t('off')}
                <GlobalSwitch feature={f} locale={locale} canEdit={canEdit} />
              </label>
            </div>

            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {t('overrides')}
              </p>
              {ov.length === 0 ? (
                <p className="text-sm text-slate-500">{t('no_overrides')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ov.map((o) => (
                    <span
                      key={o.tenant_id}
                      className={
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ' +
                        (o.enabled
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : 'border-red-500/30 bg-red-500/10 text-[#F08C8C]')
                      }
                    >
                      {o.tenant_name ?? o.tenant_id.slice(0, 8)} ·{' '}
                      {o.enabled ? t('granted') : t('denied')}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() =>
                            start(() => removeOverride(locale, f.key, o.tenant_id))
                          }
                          className="opacity-70 hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {canEdit && (
                <AddOverrideForm featureKey={f.key} tenants={tenants} locale={locale} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
