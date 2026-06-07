import type { ProductionRunInput } from '@/types/app'

/* ── Production-run cost & yield calculations (migration 003) ──────────────

   COST CALCULATION EXAMPLE
   Raw inputs for 4.2kg frozen nuggets:
     5kg  chicken breast @ 4.20 AZN/kg = 21.00 AZN
     0.5kg breadcrumbs   @ 0.80 AZN/kg =  0.40 AZN
     0.2L  oil           @ 2.50 AZN/L  =  0.50 AZN
     Total input cost: 21.90 AZN
     Output: 4.2kg nuggets
     Output unit cost: 21.90 / 4.2 = 5.21 AZN/kg
     Actual yield: 4.2 / 5.7 total input kg = 73.7%

   RULE: output_unit_cost is computed from the ACTUAL input costs captured at
   production time (unit_cost_at_time on each input row) — never from the
   ingredient's current cost_per_unit, because prices drift and historical
   production costs must stay accurate.
   ───────────────────────────────────────────────────────────────────────── */

// Minimal shape needed for the cost calc — every input contributes
// quantity_used × unit_cost_at_time.
type CostInput = Pick<
  ProductionRunInput,
  'quantity_used' | 'unit_cost_at_time'
>

// Total cost of all raw inputs consumed in a run.
export function totalInputCost(inputs: CostInput[]): number {
  return inputs.reduce(
    (sum, i) => sum + i.quantity_used * i.unit_cost_at_time,
    0
  )
}

// Cost per output unit = total input cost / output quantity.
// Returns 0 when output quantity is non-positive (avoids divide-by-zero).
export function calculateProductionCost(
  inputs: CostInput[],
  outputQuantity: number
): number {
  if (outputQuantity <= 0) return 0
  return totalInputCost(inputs) / outputQuantity
}

// Actual yield = output quantity / total input quantity (as a 0–1 fraction).
// Assumes inputs and output share a comparable unit (e.g. kg). Returns 0 when
// there is no input quantity.
export function calculateActualYield(
  inputs: Pick<ProductionRunInput, 'quantity_used'>[],
  outputQuantity: number
): number {
  const totalInput = inputs.reduce((sum, i) => sum + i.quantity_used, 0)
  if (totalInput <= 0) return 0
  return outputQuantity / totalInput
}

// Default expiry date for a produced batch: produced date + shelf life days.
// Returns null when no shelf life is configured for the output ingredient.
// `producedAtISO` is passed in (callers stamp the time) to keep this pure.
export function defaultProductionExpiry(
  producedAtISO: string,
  shelfLifeDays: number | null
): string | null {
  if (shelfLifeDays == null || shelfLifeDays <= 0) return null
  const d = new Date(producedAtISO)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + shelfLifeDays)
  return d.toISOString().slice(0, 10) // yyyy-mm-dd
}
