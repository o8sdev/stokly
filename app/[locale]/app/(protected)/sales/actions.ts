'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireTenant, canWrite } from '@/lib/auth/tenant'

export interface SalesResult {
  error?: string
  success?: boolean
}

const dateRe = /^\d{4}-\d{2}-\d{2}$/
const amountSchema = z.coerce.number().min(0).max(100_000_000)

// Upsert one day's total sales (one row per tenant per date).
export async function saveDailySales(
  locale: string,
  _prev: SalesResult,
  formData: FormData
): Promise<SalesResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  const date = String(formData.get('sale_date') ?? '')
  if (!dateRe.test(date)) return { error: 'validation' }
  const amount = amountSchema.safeParse(formData.get('total_amount'))
  if (!amount.success) return { error: 'validation' }
  const note = String(formData.get('note') ?? '').trim() || null

  const supabase = createClient()
  const { error } = await supabase.from('daily_sales').upsert(
    {
      tenant_id: ctx.tenantId,
      sale_date: date,
      total_amount: amount.data,
      note,
      recorded_by: ctx.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,sale_date' }
  )
  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/app/sales`)
  revalidatePath(`/${locale}/app/sales/${date}`)
  return { success: true }
}

export interface SalesEntryInput {
  date: string
  amount: number
  note?: string
}

// Save many days at once (the missing-sales panel). Upserts all rows.
export async function saveDailySalesBatch(
  locale: string,
  entries: SalesEntryInput[]
): Promise<SalesResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }
  if (!Array.isArray(entries) || entries.length === 0) {
    return { error: 'validation' }
  }

  const rows = []
  for (const e of entries) {
    if (!dateRe.test(e.date)) return { error: 'validation' }
    const amount = amountSchema.safeParse(e.amount)
    if (!amount.success) return { error: 'validation' }
    rows.push({
      tenant_id: ctx.tenantId,
      sale_date: e.date,
      total_amount: amount.data,
      note: (e.note ?? '').trim() || null,
      recorded_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('daily_sales')
    .upsert(rows, { onConflict: 'tenant_id,sale_date' })
  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/app/sales`)
  return { success: true }
}
