'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireTenant, canWrite } from '@/lib/auth/tenant'
import { createPeriodForCount } from '@/lib/data/counts'
import { logActivity } from '@/lib/data/activity'
import {
  stockCountSchema,
  deliverySchema,
  wasteSchema,
  transferSchema,
} from '@/lib/validations/stock-movement'
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

// STOCK COUNT — per-location. record_stock_count reconciles the chosen station's
// batches to each counted figure and appends a 'count' movement carrying the
// DELTA (from_location_id = the station). One station per submission; counting
// the kitchen never touches the bar/warehouse.
export async function submitStockCount(
  locale: string,
  _prev: InventoryActionResult,
  formData: FormData
): Promise<InventoryActionResult> {
  const ctx = await requireTenant(locale)
  const parsed = stockCountSchema.safeParse(parseJson(formData))
  if (!parsed.success) return { error: 'validation' }

  // Stamp the count at end-of-day of the chosen business date so the absolute
  // count sorts after that day's deltas (deriveStockLevel orders by created_at).
  // EXCEPT the very first (baseline) count: it establishes OPENING stock, so it
  // is stamped at NOW — otherwise every delivery/production/sale recorded later
  // the same day would sort before the 23:59 absolute and be silently erased
  // from derived levels until midnight (the day-0 onboarding trap).
  const supabase = createClient()
  const { count: prevPeriods } = await supabase
    .from('count_periods')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId)
  const isBaseline = (prevPeriods ?? 0) === 0
  const cd = parsed.data.count_date
  // Non-baseline counts are stamped at end-of-day of the business date so the
  // count sorts after that day's deltas; the baseline (opening) count is stamped
  // at NOW (the day-0 trap). Null → the RPC uses now().
  const occurredAt =
    !isBaseline && cd && /^\d{4}-\d{2}-\d{2}$/.test(cd)
      ? new Date(`${cd}T23:59:59Z`).toISOString()
      : null
  const locationId = parsed.data.location_id || null

  // Each line carries its own station, so one submission reconciles every
  // location in a single count (the RPC handles per-line location_id). Lines
  // that omit a station fall back to the form default / tenant default.
  const { error } = await supabase.rpc('record_stock_count', {
    p_lines: parsed.data.lines.map((line) => ({
      ingredient_id: line.ingredient_id,
      location_id: line.location_id || locationId,
      counted_qty: line.quantity,
      occurred_at: occurredAt,
    })),
  })
  if (error) return { error: 'generic' }

  const locationsCounted = new Set(
    parsed.data.lines.map((l) => l.location_id || locationId || 'default')
  ).size
  await logActivity('inventory.count', {
    entityType: 'count',
    meta: { lines: parsed.data.lines.length, locations: locationsCounted },
  })

  // Close the period (last count → the counted business date) and build its report.
  const periodId = await createPeriodForCount(ctx.tenantId, ctx.userId, cd)

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

  // Resolve the receiving location: the chosen one if it belongs to the tenant.
  // For a SINGLE-station tenant (exactly one consumption point) land new stock
  // directly in that point so it's immediately usable — no Anbar→Mətbəx transfer
  // needed (consumption is strict per-location). Multi-station tenants keep
  // landing in the default receiving dock and route deliberately.
  const { data: locs } = await supabase
    .from('storage_locations')
    .select('id, is_default_receiving, is_consumption_point')
    .eq('tenant_id', ctx.tenantId)
  const chosen = parsed.data.location_id || ''
  const validChosen = (locs ?? []).some((l) => l.id === chosen) ? chosen : null
  const consumptionPts = (locs ?? []).filter((l) => l.is_consumption_point)
  const soleConsumption =
    consumptionPts.length === 1 ? consumptionPts[0].id : null
  const locationId =
    validChosen ??
    soleConsumption ??
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

  await logActivity('inventory.transfer', {
    entityType: 'transfer',
    entityId: parsed.data.ingredient_id,
    meta: {
      quantity: parsed.data.quantity,
      from: parsed.data.from_location_id,
      to: parsed.data.to_location_id,
    },
  })
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
    // Strict per-location: the routed station is empty but the ingredient sits
    // at another location. Tell the form to prompt a transfer (it has the
    // per-location breakdown to say where).
    if (error.message?.includes('location_short')) {
      return { error: 'stock_elsewhere' }
    }
    return { error: 'generic' }
  }

  await logActivity('waste.record', {
    entityType: 'waste',
    entityId: parsed.data.ingredient_id,
    meta: {
      quantity: parsed.data.quantity,
      reason: parsed.data.reason?.trim() || null,
    },
  })
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

  await logActivity('waste.reverse', {
    entityType: 'waste',
    entityId: movementId,
  })
  revalidatePath(`/${locale}/app/inventory/waste`)
  revalidatePath(`/${locale}/app/inventory`)
  revalidatePath(`/${locale}/app/dashboard`)
  return {}
}

// Remove all expired stock: each active batch past its use-by gets an
// 'expiry_writeoff' movement and is marked expired (so it leaves inventory).
export async function writeOffExpired(
  locale: string,
  reason: string
): Promise<InventoryActionResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }
  if (!reason.trim()) return { error: 'reason_required' }
  const supabase = createClient()
  const { data, error } = await supabase.rpc('write_off_expired', {
    p_tenant: ctx.tenantId,
    p_reason: reason.trim(),
  })
  if (error) return { error: 'generic' }
  await logActivity('inventory.writeoff_expired', {
    entityType: 'writeoff',
    meta: { batches: data, reason: reason.trim() },
  })
  revalidatePath(`/${locale}/app/inventory`)
  revalidatePath(`/${locale}/app/dashboard`)
  return { success: true }
}
