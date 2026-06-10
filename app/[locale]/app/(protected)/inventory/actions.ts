'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireTenant, canWrite } from '@/lib/auth/tenant'
import { createPeriodForCount } from '@/lib/data/counts'
import {
  stockCountSchema,
  deliverySchema,
  wasteSchema,
  transferSchema,
} from '@/lib/validations/stock-movement'
import type { Database } from '@/types/database'

type MovementInsert =
  Database['public']['Tables']['stock_movements']['Insert']

export interface InventoryActionResult {
  error?: string
  success?: boolean
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

  // Close the period (last count → today) and generate its stored report.
  const periodId = await createPeriodForCount(ctx.tenantId, ctx.userId)

  revalidatePath(`/${locale}/app/inventory`)
  revalidatePath(`/${locale}/app/reports/period`)
  revalidatePath(`/${locale}/app/dashboard`)
  if (periodId) redirect(`/${locale}/app/reports/period/${periodId}`)
  redirect(`/${locale}/app/inventory`)
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

  const notes = parsed.data.notes || null

  const supabase = createClient()

  // Resolve the receiving location: the chosen one if it belongs to the tenant,
  // else the default-receiving dock (Warehouse). New stock lands here; the user
  // moves it to the kitchen later.
  const { data: locs } = await supabase
    .from('storage_locations')
    .select('id, is_default_receiving')
    .eq('tenant_id', ctx.tenantId)
  const chosen = parsed.data.location_id || ''
  const validChosen = (locs ?? []).some((l) => l.id === chosen) ? chosen : null
  const locationId =
    validChosen ??
    (locs ?? []).find((l) => l.is_default_receiving)?.id ??
    null

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
    // Supplier is per line (the same ingredient may come from different
    // suppliers); "" → no supplier.
    const lineSupplier = line.supplier_id || null

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
        supplier_id: lineSupplier,
        notes,
        recorded_by: ctx.userId,
        expiry_date: expiry,
        to_location_id: locationId,
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
        supplier_id: lineSupplier,
        quantity_received: line.quantity,
        quantity_remaining: line.quantity,
        unit,
        unit_cost: line.unit_cost,
        expiry_date: expiry,
        supplier_lot_no: line.supplier_lot?.trim() || null,
        status: 'active',
        created_from_movement_id: movement.id,
        location_id: locationId,
        // batch_code (LOT-YYMMDD-NN) is generated by the set_batch_code trigger.
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

  revalidatePath(`/${locale}/app/inventory`)
  revalidatePath(`/${locale}/app/purchases`)
  // A delivery changes inventory value / low-stock / expiry widgets on the
  // dashboard — invalidate it so those don't read stale from the router cache.
  revalidatePath(`/${locale}/app/dashboard`)
  // Land back on the Purchases (Alışlar) page so the new buy shows in history.
  redirect(`/${locale}/app/purchases`)
}

// TRANSFER — move stock between locations (e.g. warehouse → kitchen). The DB
// function FIFO-splits the source batches atomically (and stamps an optional new
// use-by on the moved stock, for freezing). Total stock is unchanged.
export async function submitTransfer(
  locale: string,
  _prev: InventoryActionResult,
  formData: FormData
): Promise<InventoryActionResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }
  const parsed = transferSchema.safeParse(parseJson(formData))
  if (!parsed.success) return { error: 'validation' }
  if (parsed.data.from_location_id === parsed.data.to_location_id) {
    return { error: 'same_location' }
  }

  const supabase = createClient()
  const { error } = await supabase.rpc('transfer_stock', {
    p_ingredient_id: parsed.data.ingredient_id,
    p_from_location_id: parsed.data.from_location_id,
    p_to_location_id: parsed.data.to_location_id,
    p_quantity: parsed.data.quantity,
    p_expiry_date: parsed.data.expiry_date || null,
  })
  if (error) {
    // The RPC raises when the source location can't cover the move.
    if (error.message?.includes('insufficient')) return { error: 'insufficient' }
    return { error: 'generic' }
  }

  revalidatePath(`/${locale}/app/inventory`)
  revalidatePath(`/${locale}/app/dashboard`)
  redirect(`/${locale}/app/inventory`)
}

// WASTE — single 'waste' movement (negative impact, stored as positive
// magnitude; deriveStockLevel subtracts the absolute value).
export async function submitWaste(
  locale: string,
  _prev: InventoryActionResult,
  formData: FormData
): Promise<InventoryActionResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }
  const parsed = wasteSchema.safeParse(parseJson(formData))
  if (!parsed.success) return { error: 'validation' }

  const supabase = createClient()

  // Confirm the ingredient is this tenant's, and snapshot its cost so the
  // logged waste value stays accurate even if the price changes later.
  const { data: ing } = await supabase
    .from('ingredients')
    .select('id, cost_per_unit')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', parsed.data.ingredient_id)
    .maybeSingle()
  if (!ing) return { error: 'validation' }

  // Confirm the category is this tenant's.
  const { data: cat } = await supabase
    .from('waste_categories')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', parsed.data.waste_category_id)
    .maybeSingle()
  if (!cat) return { error: 'validation' }

  const occurredAt = parsed.data.occurred_at
    ? new Date(parsed.data.occurred_at).toISOString()
    : null

  // record_waste writes the 'waste' movement AND FIFO-consumes kitchen batches
  // atomically; it raises if the kitchen can't cover the waste.
  const { error } = await supabase.rpc('record_waste', {
    p_ingredient_id: parsed.data.ingredient_id,
    p_quantity: parsed.data.quantity,
    p_category_id: parsed.data.waste_category_id,
    p_unit_cost: ing.cost_per_unit ?? 0,
    p_reason: parsed.data.reason?.trim() || null,
    p_notes: parsed.data.notes?.trim() || null,
    p_occurred_at: occurredAt,
    p_location_id: parsed.data.location_id || null,
  })
  if (error) {
    if (error.message?.includes('location_short')) return { error: 'kitchen_short' }
    return { error: 'generic' }
  }

  // Stay on the waste page (don't redirect to the same route — that leaves the
  // form's useFormState undefined). The client refreshes to show the new entry.
  revalidatePath(`/${locale}/app/inventory/waste`)
  revalidatePath(`/${locale}/app/inventory`)
  revalidatePath(`/${locale}/app/dashboard`)
  return { success: true }
}

// Append-only correction of a mistaken waste entry. We never edit/delete the
// original waste movement; instead we insert an `adjustment` that adds the
// wasted quantity back to stock and points at the original via
// reverses_movement_id. The log then renders the original as reversed.
export async function reverseWaste(
  locale: string,
  movementId: string
): Promise<InventoryActionResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  const supabase = createClient()
  // reverse_waste restores the consumed kitchen batches and appends a reversing
  // 'adjustment' (never edits the original), all atomically.
  const { error } = await supabase.rpc('reverse_waste', {
    p_movement_id: movementId,
  })
  if (error) {
    if (error.message?.includes('already_reversed')) {
      return { error: 'already_reversed' }
    }
    if (error.message?.includes('not_waste')) return { error: 'validation' }
    return { error: 'generic' }
  }

  revalidatePath(`/${locale}/app/inventory/waste`)
  revalidatePath(`/${locale}/app/inventory`)
  revalidatePath(`/${locale}/app/dashboard`)
  return {}
}

// Remove all expired stock: each active batch past its use-by gets an
// 'expiry_writeoff' movement and is marked expired (so it leaves inventory).
export async function writeOffExpired(
  locale: string
): Promise<InventoryActionResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }
  const supabase = createClient()
  const { error } = await supabase.rpc('write_off_expired', {
    p_tenant: ctx.tenantId,
  })
  if (error) return { error: 'generic' }
  revalidatePath(`/${locale}/app/inventory`)
  revalidatePath(`/${locale}/app/dashboard`)
  return { success: true }
}
