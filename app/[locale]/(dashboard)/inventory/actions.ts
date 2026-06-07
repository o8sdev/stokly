'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/tenant'
import {
  stockCountSchema,
  deliverySchema,
  wasteSchema,
} from '@/lib/validations/stock-movement'
import type { Database } from '@/types/database'

type MovementInsert =
  Database['public']['Tables']['stock_movements']['Insert']

export interface InventoryActionResult {
  error?: string
}

function parseJson(formData: FormData): unknown {
  const raw = String(formData.get('payload') ?? '')
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// STOCK COUNT — creates one append-only 'count' movement per counted line.
// quantity IS the absolute level (is_absolute=true). Never updates rows.
export async function submitStockCount(
  locale: string,
  _prev: InventoryActionResult,
  formData: FormData
): Promise<InventoryActionResult> {
  const ctx = await requireTenant(locale)
  const parsed = stockCountSchema.safeParse(parseJson(formData))
  if (!parsed.success) return { error: 'validation' }

  const rows: MovementInsert[] = parsed.data.lines.map((line) => ({
    tenant_id: ctx.tenantId,
    ingredient_id: line.ingredient_id,
    movement_type: 'count',
    quantity: line.quantity,
    is_absolute: true,
    recorded_by: ctx.userId,
  }))

  const supabase = createClient()
  const { error } = await supabase.from('stock_movements').insert(rows)
  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/inventory`)
  redirect(`/${locale}/inventory`)
}

// DELIVERY — one 'delivery' movement per line (positive delta). Also updates
// the ingredient's cost_per_unit when the paid unit cost differs.
export async function submitDelivery(
  locale: string,
  _prev: InventoryActionResult,
  formData: FormData
): Promise<InventoryActionResult> {
  const ctx = await requireTenant(locale)
  const parsed = deliverySchema.safeParse(parseJson(formData))
  if (!parsed.success) return { error: 'validation' }

  const supplierId = parsed.data.supplier_id || null
  const notes = parsed.data.notes || null

  const rows: MovementInsert[] = parsed.data.lines.map((line) => ({
    tenant_id: ctx.tenantId,
    ingredient_id: line.ingredient_id,
    movement_type: 'delivery',
    quantity: line.quantity,
    is_absolute: false,
    unit_cost: line.unit_cost,
    supplier_id: supplierId,
    notes,
    recorded_by: ctx.userId,
  }))

  const supabase = createClient()
  const { error } = await supabase.from('stock_movements').insert(rows)
  if (error) return { error: 'generic' }

  // Refresh ingredient prices to the latest paid cost where it changed.
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, cost_per_unit')
    .eq('tenant_id', ctx.tenantId)
    .in(
      'id',
      parsed.data.lines.map((l) => l.ingredient_id)
    )

  const current = new Map(
    (ingredients ?? []).map((i) => [i.id, i.cost_per_unit])
  )
  for (const line of parsed.data.lines) {
    const existing = current.get(line.ingredient_id)
    if (existing != null && existing !== line.unit_cost) {
      await supabase
        .from('ingredients')
        .update({ cost_per_unit: line.unit_cost })
        .eq('id', line.ingredient_id)
        .eq('tenant_id', ctx.tenantId)
    }
  }

  revalidatePath(`/${locale}/inventory`)
  redirect(`/${locale}/inventory`)
}

// WASTE — single 'waste' movement (negative impact, stored as positive
// magnitude; deriveStockLevel subtracts the absolute value).
export async function submitWaste(
  locale: string,
  _prev: InventoryActionResult,
  formData: FormData
): Promise<InventoryActionResult> {
  const ctx = await requireTenant(locale)
  const parsed = wasteSchema.safeParse(parseJson(formData))
  if (!parsed.success) return { error: 'validation' }

  const createdAt = parsed.data.occurred_at
    ? new Date(parsed.data.occurred_at).toISOString()
    : undefined

  const row: MovementInsert = {
    tenant_id: ctx.tenantId,
    ingredient_id: parsed.data.ingredient_id,
    movement_type: 'waste',
    quantity: parsed.data.quantity,
    is_absolute: false,
    reason: parsed.data.waste_category_id,
    notes: parsed.data.notes || null,
    recorded_by: ctx.userId,
    ...(createdAt ? { created_at: createdAt } : {}),
  }

  const supabase = createClient()
  const { error } = await supabase.from('stock_movements').insert(row)
  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/inventory`)
  redirect(`/${locale}/inventory`)
}
