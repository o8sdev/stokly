'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const SELECT =
  'h-9 rounded-lg border border-white/15 bg-white/5 px-2 text-sm text-white focus:border-brand focus:outline-none'

interface PlanOpt {
  key: string
  label: string
}

const ROW1_KEYS = ['plan', 'status', 'health'] as const
const ROW2_KEYS = [
  'signupFrom',
  'signupTo',
  'lastActive',
  'payment',
  'ing',
  'rec',
] as const

export function TenantFilterBar({ plans }: { plans: PlanOpt[] }) {
  const t = useTranslations('admin.tenants')
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [advanced, setAdvanced] = React.useState(
    ROW2_KEYS.some((k) => params.get(k))
  )
  const [searchValue, setSearchValue] = React.useState(params.get('search') ?? '')

  const update = React.useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === '') next.delete(k)
        else next.set(k, v)
      }
      next.delete('page')
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [params, pathname, router]
  )

  // Debounced search.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      if ((params.get('search') ?? '') !== searchValue) {
        update({ search: searchValue || null })
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [searchValue, params, update])

  function reset() {
    setSearchValue('')
    router.replace(pathname, { scroll: false })
  }

  const get = (k: string) => params.get(k) ?? ''
  const activeChips = [...ROW1_KEYS, ...ROW2_KEYS, 'search'].filter((k) =>
    params.get(k)
  )

  function Sel({
    name,
    options,
  }: {
    name: string
    options: { value: string; label: string }[]
  }) {
    return (
      <select
        value={get(name)}
        onChange={(e) => update({ [name]: e.target.value || null })}
        className={SELECT}
      >
        <option value="">{t(`filter.${name}`)}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={t('filter.search')}
            className="h-9 w-full rounded-lg border border-white/15 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-brand focus:outline-none"
          />
        </div>
        <Sel
          name="plan"
          options={plans.map((p) => ({ value: p.key, label: p.label }))}
        />
        <Sel
          name="status"
          options={['active', 'trial', 'suspended', 'churned'].map((s) => ({
            value: s,
            label: t(`status.${s}`),
          }))}
        />
        <Sel
          name="health"
          options={['healthy', 'fair', 'risky', 'critical'].map((h) => ({
            value: h,
            label: t(`health.${h}`),
          }))}
        />
        <button
          type="button"
          onClick={() => setAdvanced((a) => !a)}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors',
            advanced
              ? 'border-brand/40 bg-brand/10 text-brand'
              : 'border-white/15 text-slate-300 hover:bg-white/10'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t('filter.advanced')}
        </button>
      </div>

      {advanced && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <label className="text-xs text-slate-500">{t('filter.signup')}</label>
          <input
            type="date"
            value={get('signupFrom')}
            onChange={(e) => update({ signupFrom: e.target.value || null })}
            className={SELECT}
          />
          <span className="text-slate-600">→</span>
          <input
            type="date"
            value={get('signupTo')}
            onChange={(e) => update({ signupTo: e.target.value || null })}
            className={SELECT}
          />
          <Sel
            name="lastActive"
            options={[
              { value: 'today', label: t('filter.today') },
              { value: 'week', label: t('filter.this_week') },
              { value: 'month', label: t('filter.this_month') },
              { value: 'inactive14', label: t('filter.inactive14') },
              { value: 'inactive30', label: t('filter.inactive30') },
            ]}
          />
          <Sel
            name="payment"
            options={['paid', 'overdue', 'trial'].map((p) => ({
              value: p,
              label: t(`payment.${p}`),
            }))}
          />
          <Sel
            name="ing"
            options={[
              { value: '0', label: '0' },
              { value: '1-10', label: '1–10' },
              { value: '11-50', label: '11–50' },
              { value: '50+', label: '50+' },
            ]}
          />
          <Sel
            name="rec"
            options={[
              { value: '0', label: '0' },
              { value: '1-5', label: '1–5' },
              { value: '6-20', label: '6–20' },
              { value: '20+', label: '20+' },
            ]}
          />
        </div>
      )}

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          {activeChips.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200"
            >
              {k}: {params.get(k)}
              <button
                type="button"
                onClick={() => {
                  if (k === 'search') setSearchValue('')
                  update({ [k]: null })
                }}
                className="opacity-70 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={reset}
            className="text-xs text-brand hover:opacity-80"
          >
            {t('filter.reset')}
          </button>
        </div>
      )}
    </div>
  )
}
