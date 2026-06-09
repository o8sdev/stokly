'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireTenant, canWrite } from '@/lib/auth/tenant'
import { hasInitialCount } from '@/lib/data/counts'
import {
  getIngredients,
  getRecipes,
  getRecipeIngredients,
} from '@/lib/data/queries'
import { computeTheoreticalUsage } from '@/lib/calculations/theoretical-usage'
import type { Json } from '@/types/database'

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
  if (!(await hasInitialCount(ctx.tenantId))) return { error: 'no_count' }

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
  if (!(await hasInitialCount(ctx.tenantId))) return { error: 'no_count' }
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

// ── Itemized sales (receipts: menu item × quantity) ──────────────────────
export interface SalesItemInput {
  recipe_id: string
  quantity: number
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const qtySchema = z.coerce.number().min(0).max(1_000_000)

// Save a day's sales as menu-item line items. Revenue is derived from the
// items (qty × the recipe's current sale price, snapshotted), and the line
// items drive theoretical ingredient usage in the period report. Replaces the
// day's existing line items wholesale.
export async function saveDailySalesItems(
  locale: string,
  payload: { date: string; note?: string | null; items: SalesItemInput[] }
): Promise<SalesResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }
  if (!(await hasInitialCount(ctx.tenantId))) return { error: 'no_count' }

  const date = String(payload.date ?? '')
  if (!dateRe.test(date)) return { error: 'validation' }
  const note = (payload.note ?? '').trim() || null

  // Validate + merge duplicate rows, dropping zero quantities.
  const merged = new Map<string, number>()
  for (const it of payload.items ?? []) {
    if (!uuidRe.test(it.recipe_id)) return { error: 'validation' }
    const q = qtySchema.safeParse(it.quantity)
    if (!q.success) return { error: 'validation' }
    if (q.data > 0) {
      merged.set(it.recipe_id, (merged.get(it.recipe_id) ?? 0) + q.data)
    }
  }

  const supabase = createClient()

  // A confirmed day is locked — its items can't be edited (the DB trigger is the
  // hard backstop; this returns a friendly error first).
  const { data: existing } = await supabase
    .from('daily_sales')
    .select('status')
    .eq('tenant_id', ctx.tenantId)
    .eq('sale_date', date)
    .maybeSingle()
  if (existing?.status === 'confirmed') return { error: 'locked' }

  // Snapshot sale prices server-side — never trust client-supplied prices, and
  // confirm every recipe belongs to this tenant.
  const recipeIds = [...merged.keys()]
  const priceById = new Map<string, number>()
  if (recipeIds.length > 0) {
    const { data: recs } = await supabase
      .from('recipes')
      .select('id, sale_price')
      .eq('tenant_id', ctx.tenantId)
      .in('id', recipeIds)
    if ((recs?.length ?? 0) !== recipeIds.length) return { error: 'validation' }
    for (const r of recs ?? []) priceById.set(r.id, Number(r.sale_price ?? 0))
  }

  const revenue = [...merged.entries()].reduce(
    (sum, [id, qty]) => sum + qty * (priceById.get(id) ?? 0),
    0
  )

  const { data: header, error: headErr } = await supabase
    .from('daily_sales')
    .upsert(
      {
        tenant_id: ctx.tenantId,
        sale_date: date,
        total_amount: Math.round(revenue * 100) / 100,
        revenue_source: 'items',
        note,
        recorded_by: ctx.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,sale_date' }
    )
    .select('id')
    .single()
  if (headErr || !header) return { error: 'generic' }

  // Replace the day's line items.
  await supabase
    .from('daily_sales_items')
    .delete()
    .eq('daily_sales_id', header.id)

  if (merged.size > 0) {
    const itemRows = [...merged.entries()].map(([recipe_id, quantity]) => ({
      tenant_id: ctx.tenantId,
      daily_sales_id: header.id,
      recipe_id,
      quantity,
      unit_price: priceById.get(recipe_id) ?? 0,
    }))
    const { error: itemErr } = await supabase
      .from('daily_sales_items')
      .insert(itemRows)
    if (itemErr) return { error: 'generic' }
  }

  revalidatePath(`/${locale}/app/sales`)
  revalidatePath(`/${locale}/app/sales/${date}`)
  return { success: true }
}

function revalidateSales(locale: string, date?: string) {
  revalidatePath(`/${locale}/app/sales`)
  if (date) revalidatePath(`/${locale}/app/sales/${date}`)
  revalidatePath(`/${locale}/app/inventory`)
  revalidatePath(`/${locale}/app/inventory/waste`)
  revalidatePath(`/${locale}/app/dashboard`)
}

// Confirm (lock) a day's itemized sales: explode the sold recipes into expected
// ingredient usage and hand it to the atomic confirm_daily_sales RPC, which
// writes the 'sale' stock movements, FIFO-consumes the LOT- batches, and locks
// the day — all in one transaction. The day is read-only afterwards.
export async function confirmDailySales(
  locale: string,
  dayId: string
): Promise<SalesResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  const supabase = createClient()
  const { data: day } = await supabase
    .from('daily_sales')
    .select('id, sale_date, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', dayId)
    .maybeSingle()
  if (!day) return { error: 'validation' }
  if (day.status === 'confirmed') return { error: 'already_confirmed' }

  const { data: items } = await supabase
    .from('daily_sales_items')
    .select('recipe_id, quantity')
    .eq('daily_sales_id', dayId)
  const sold = (items ?? []).map((i) => ({
    recipe_id: i.recipe_id,
    quantity: Number(i.quantity),
  }))

  const [ingredients, recipes, recipeIngredients] = await Promise.all([
    getIngredients(ctx.tenantId),
    getRecipes(ctx.tenantId),
    getRecipeIngredients(ctx.tenantId),
  ])
  const { usageByIngredient } = computeTheoreticalUsage(
    sold,
    ingredients,
    recipes,
    recipeIngredients
  )
  const costById = new Map(ingredients.map((i) => [i.id, i.cost_per_unit ?? 0]))
  const usage = [...usageByIngredient.entries()]
    .filter(([, qty]) => qty > 0)
    .map(([ingredient_id, quantity]) => ({
      ingredient_id,
      quantity,
      unit_cost: costById.get(ingredient_id) ?? 0,
    }))

  const { error } = await supabase.rpc('confirm_daily_sales', {
    p_day_id: dayId,
    p_usage: usage as unknown as Json,
  })
  if (error) return { error: 'generic' }

  revalidateSales(locale, day.sale_date)
  return { success: true }
}

// Void a confirmed day: the void_daily_sales RPC restores the consumed batches,
// writes append-only reversing movements, and re-opens the day to draft. Audited
// correction — history is never edited.
export async function voidDailySales(
  locale: string,
  dayId: string
): Promise<SalesResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  const supabase = createClient()
  const { data: day } = await supabase
    .from('daily_sales')
    .select('id, sale_date, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', dayId)
    .maybeSingle()
  if (!day) return { error: 'validation' }
  if (day.status !== 'confirmed') return { error: 'not_confirmed' }

  const { error } = await supabase.rpc('void_daily_sales', { p_day_id: dayId })
  if (error) return { error: 'generic' }

  revalidateSales(locale, day.sale_date)
  return { success: true }
}
