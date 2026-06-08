// Subscription plans — server-only DB loaders (editable from /admin/plans).
// Pure helpers (priceOf, planColor, …) live in ./plan-utils and are re-exported
// here for server callers; client components should import from ./plan-utils.

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Plan } from '@/types/database'

export * from './plan-utils'

export const getPlans = cache(async (): Promise<Plan[]> => {
  const supabase = createClient()
  const { data } = await supabase
    .from('plans')
    .select('*')
    .order('sort_order', { ascending: true })
  return data ?? []
})

export async function getActivePlans(): Promise<Plan[]> {
  return (await getPlans()).filter((p) => p.is_active)
}
