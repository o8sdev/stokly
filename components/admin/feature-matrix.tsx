'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Switch } from '@/components/ui/switch'
import { planColor } from '@/lib/admin/plan-utils'
import { togglePlanFeature } from '@/app/[locale]/admin/(console)/plans/actions'
import type { Plan, Feature, PlanFeature } from '@/types/database'

function cellKey(plan: string, feature: string): string {
  return `${plan}::${feature}`
}

export function FeatureMatrix({
  plans,
  features,
  matrix,
  locale,
  canEdit,
}: {
  plans: Plan[]
  features: Feature[]
  matrix: PlanFeature[]
  locale: string
  canEdit: boolean
}) {
  const t = useTranslations('admin.plans')
  const [state, setState] = React.useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {}
    for (const row of matrix) m[cellKey(row.plan_key, row.feature_key)] = row.included
    return m
  })
  const [, startTransition] = React.useTransition()

  function toggle(planKey: string, featureKey: string, next: boolean) {
    setState((s) => ({ ...s, [cellKey(planKey, featureKey)]: next }))
    startTransition(() => togglePlanFeature(locale, planKey, featureKey, next))
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 scroll-thin">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t('feature')}
            </th>
            {plans.map((p) => (
              <th key={p.key} className="px-3 py-3 text-center">
                <span className="flex flex-col items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: planColor(p.key) }}
                  />
                  <span className="text-xs font-semibold text-white">
                    {locale === 'ru' ? p.name_ru : p.name_az}
                  </span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
            <tr key={f.key} className="border-b border-white/[0.06] last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium text-white">
                  {locale === 'ru' ? f.name_ru : f.name_az}
                </p>
                <p className="font-mono text-[11px] text-slate-500">{f.key}</p>
              </td>
              {plans.map((p) => (
                <td key={p.key} className="px-3 py-3 text-center">
                  <div className="flex justify-center">
                    <Switch
                      checked={state[cellKey(p.key, f.key)] ?? false}
                      onCheckedChange={(v) => toggle(p.key, f.key, v)}
                      disabled={!canEdit}
                    />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
