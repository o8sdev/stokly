import type { StockMovement } from '@/types/database'
import type {
  IngredientBatch,
  ExpiringBatch,
  BatchConsumption,
  StockMovementInsert,
} from '@/types/app'

// INVARIANT: for any ingredient,
//   SUM(ingredient_batches.quantity_remaining where status='active')
//   must equal deriveStockLevel(movements, ingredientId).
// The movement log (below) and the batch table (further down) are two views of
// the same stock and must never disagree. deriveStockLevel() is unchanged and
// remains the ingredient-level source of truth; batch helpers operate on the
// batch table directly.

// Derive current stock level from movement log
// This is the ONLY way stock levels are calculated — never stored directly
export function deriveStockLevel(
  movements: StockMovement[],
  ingredientId: string
): number {
  const relevant = movements
    .filter((m) => m.ingredient_id === ingredientId)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

  let level = 0

  for (const movement of relevant) {
    if (movement.is_absolute) {
      // 'count' movements set the absolute level
      level = movement.quantity
    } else {
      // All other movements are deltas
      switch (movement.movement_type) {
        case 'delivery':
        case 'production_output': // a batch produced in-house adds stock
          level += movement.quantity
          break
        case 'waste':
        case 'sale':
        case 'production_input': // raw consumed by a production run
        case 'expiry_writeoff': // expired stock removed
          level -= Math.abs(movement.quantity)
          break
        case 'adjustment':
          level += movement.quantity // can be negative
          break
        // 'count' handled above (is_absolute); 'transfer' is a no-op for the
        // ingredient total (it only changes which location holds the stock).
      }
    }
  }

  return Math.max(0, level)
}

// Build a map of ingredientId -> derived stock level in a single pass.
// More efficient than calling deriveStockLevel per ingredient when rendering
// the full inventory list.
export function deriveAllStockLevels(
  movements: StockMovement[]
): Map<string, number> {
  const sorted = [...movements].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const levels = new Map<string, number>()

  for (const movement of sorted) {
    const current = levels.get(movement.ingredient_id) ?? 0
    if (movement.is_absolute) {
      levels.set(movement.ingredient_id, movement.quantity)
      continue
    }
    switch (movement.movement_type) {
      case 'delivery':
      case 'production_output':
        levels.set(movement.ingredient_id, current + movement.quantity)
        break
      case 'waste':
      case 'sale':
      case 'production_input':
      case 'expiry_writeoff':
        levels.set(
          movement.ingredient_id,
          current - Math.abs(movement.quantity)
        )
        break
      case 'adjustment':
        levels.set(movement.ingredient_id, current + movement.quantity)
        break
      // 'transfer' is intentionally a no-op for the ingredient total.
    }
  }

  // Clamp negatives to zero.
  for (const [id, level] of levels) {
    if (level < 0) levels.set(id, 0)
  }

  return levels
}

// Derive every ingredient's stock level as it stood at a point in time, by
// replaying only the movements on or before `asOfIso`. Used to snapshot opening
// and closing inventory at the two boundaries of a count period.
export function deriveStockLevelsAsOf(
  movements: StockMovement[],
  asOfIso: string
): Map<string, number> {
  const cutoff = new Date(asOfIso).getTime()
  return deriveAllStockLevels(
    movements.filter((m) => new Date(m.created_at).getTime() <= cutoff)
  )
}

// Most recent 'count' movement timestamp for an ingredient, or null.
export function lastCountDate(
  movements: StockMovement[],
  ingredientId: string
): string | null {
  const counts = movements
    .filter(
      (m) => m.ingredient_id === ingredientId && m.movement_type === 'count'
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  return counts[0]?.created_at ?? null
}

/* ── Batch-level FIFO operations (migration 003) ──────────────────────────
   These work on ingredient_batches directly, NOT on the movement log. The
   invariant noted at the top of this file must hold: the sum of active batch
   remainders for an ingredient equals deriveStockLevel() for that ingredient.
   ───────────────────────────────────────────────────────────────────────── */

// Consume stock using FIFO — oldest batch first.
// `batches` must be the active batches sorted by received_date ASC.
// Returns the per-batch consumption records (which batch, how much, at what
// cost). Throws if the batches cannot cover the requested quantity.
export function consumeFIFO(
  batches: IngredientBatch[],
  quantityNeeded: number
): BatchConsumption[] {
  const consumptions: BatchConsumption[] = []
  let remaining = quantityNeeded

  for (const batch of batches) {
    if (remaining <= 0) break
    const consume = Math.min(batch.quantity_remaining, remaining)
    if (consume <= 0) continue
    consumptions.push({
      batch_id: batch.id,
      quantity_consumed: consume,
      unit_cost: batch.unit_cost,
    })
    remaining -= consume
  }

  if (remaining > 1e-9) {
    // Not enough stock across all batches.
    throw new Error(`Insufficient stock. Short by ${remaining} units.`)
  }

  return consumptions
}

// Check for batches expiring within `daysThreshold` days. Active batches with
// a set expiry date that falls on or before the threshold are returned,
// annotated with days_remaining and sorted soonest-first.
export function getExpiringBatches(
  batches: IngredientBatch[],
  daysThreshold = 7
): Omit<ExpiringBatch, 'ingredient_name'>[] {
  const threshold = new Date()
  threshold.setDate(threshold.getDate() + daysThreshold)

  return batches
    .filter(
      (b) =>
        b.status === 'active' &&
        b.expiry_date !== null &&
        new Date(b.expiry_date) <= threshold
    )
    .map((b) => ({
      ...b,
      days_remaining: Math.ceil(
        (new Date(b.expiry_date as string).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      ),
    }))
    .sort((a, b) => a.days_remaining - b.days_remaining)
}

// Build the append-only stock movement that writes off an expired batch.
// Call this for any active batch past its expiry_date (e.g. on dashboard load
// or in a scheduled job). The caller also flips the batch status to 'expired'
// / 'written_off' and zeroes quantity_remaining.
export function buildExpiryWriteOff(
  batch: IngredientBatch
): StockMovementInsert {
  return {
    tenant_id: batch.tenant_id,
    ingredient_id: batch.ingredient_id,
    movement_type: 'expiry_writeoff',
    quantity: -batch.quantity_remaining,
    is_absolute: false,
    batch_id: batch.id,
    reason: 'Automatic write-off: batch expired',
    notes: `Batch received ${batch.received_date}, expired ${batch.expiry_date}`,
  }
}
