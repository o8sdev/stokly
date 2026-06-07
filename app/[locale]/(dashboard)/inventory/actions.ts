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

// DELIVERY — for each line:
//   1. append a 'delivery' stock_movement (positive delta, append-only)
//   2. create an ingredient_batches row (the physical batch) linked back to
//      that movement via created_from_movement_id, and stamp the movement's
//      batch_id + expiry_date
//   3. refresh ingredient.cost_per_unit when the paid price changed
// Movements are inserted one per line so each batch can link to its own
// movement id (the FK that ties the append-only log to the batch table).
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

  const supabase = createClient()

  // Need each ingredient's base unit (for the batch) and current price.
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, cost_per_unit, unit')
    .eq('tenant_id', ctx.tenantId)
    .in(
      'id',
      parsed.data.lines.map((l) => l.ingredient_id)
    )

  const ingredientById = new Map(
    (ingredients ?? []).map((i) => [i.id, i])
  )

  for (const line of parsed.data.lines) {
    const expiry = line.expiry_date ? line.expiry_date : null
    const ing = ingredientById.get(line.ingredient_id)
    const unit = ing?.unit ?? ''

    // 1. Append the delivery movement and grab its id.
    const { data: movement, error: moveErr } = await supabase
      .from('stock_movements')
      .insert({
        tenant_id: ctx.tenantId,
        ingredient_id: line.ingredient_id,
        movement_type: 'delivery',
        quantity: line.quantity,
        is_absolute: false,
        unit_cost: line.unit_cost,
        supplier_id: supplierId,
        notes,
        recorded_by: ctx.userId,
        expiry_date: expiry,
      })
      .select('id')
      .single()

    if (moveErr || !movement) return { error: 'generic' }

    // 2. Create the physical batch for this delivery line. The link is
    //    one-directional (batch.created_from_movement_id → movement); we do NOT
    //    write back to the append-only movement. movement.batch_id is reserved
    //    for consumption movements (production_input / expiry_writeoff).
    const { error: batchErr } = await supabase
      .from('ingredient_batches')
      .insert({
        tenant_id: ctx.tenantId,
        ingredient_id: line.ingredient_id,
        supplier_id: supplierId,
        quantity_received: line.quantity,
        quantity_remaining: line.quantity,
        unit,
        unit_cost: line.unit_cost,
        expiry_date: expiry,
        status: 'active',
        created_from_movement_id: movement.id,
      })

    if (batchErr) return { error: 'generic' }

    // 3. Refresh the ingredient price when the paid cost changed.
    const existing = ing?.cost_per_unit
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
