'use server'

import { revalidatePath } from 'next/cache'
import { requireTenant, canWrite } from '@/lib/auth/tenant'
import { generatePeriodReport } from '@/lib/data/counts'

export interface RegenResult {
  ok?: boolean
  error?: boolean
}

// Recompute a period's stored report from all current data (e.g. after late
// sales/deliveries were entered) and bump its version.
export async function regeneratePeriodReport(
  locale: string,
  periodId: string
): Promise<RegenResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: true }

  const res = await generatePeriodReport(ctx.tenantId, periodId, {
    bumpVersion: true,
  })
  if (!res) return { error: true }

  revalidatePath(`/${locale}/app/reports/period/${periodId}`)
  revalidatePath(`/${locale}/app/reports/period`)
  return { ok: true }
}
