// Pure plan helpers — safe to import from client components (no server deps).
// The DB loaders live in ./plans (server-only).

import type { Plan } from '@/types/database'

export function planByKey(
  plans: Plan[],
  key: string | null | undefined
): Plan | undefined {
  if (!key) return undefined
  return plans.find((p) => p.key === key)
}

export function priceOf(plans: Plan[], key: string | null | undefined): number {
  return planByKey(plans, key)?.monthly_price ?? 0
}

export function rankOf(plans: Plan[], key: string | null | undefined): number {
  return planByKey(plans, key)?.sort_order ?? -1
}

export function planName(
  plans: Plan[],
  key: string | null | undefined,
  locale: string
): string {
  const p = planByKey(plans, key)
  if (!p) return key ?? '—'
  return locale === 'ru' ? p.name_ru : p.name_az
}

export function nextTier(plans: Plan[], key: string): Plan | undefined {
  const ladder = [...plans]
    .filter((p) => p.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
  const i = ladder.findIndex((p) => p.key === key)
  return i >= 0 ? ladder[i + 1] : undefined
}

export function prevTier(plans: Plan[], key: string): Plan | undefined {
  const ladder = [...plans]
    .filter((p) => p.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
  const i = ladder.findIndex((p) => p.key === key)
  return i > 0 ? ladder[i - 1] : undefined
}

// Distinct chart/badge colour per plan tier (donut + badges). Only two plans
// exist — trial + normal (Standart); planColor() falls back for anything else.
export const PLAN_COLORS: Record<string, string> = {
  trial: '#94A3B8',
  normal: '#00C896',
}

export function planColor(key: string): string {
  return PLAN_COLORS[key] ?? '#64748B'
}
