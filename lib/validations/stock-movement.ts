import { z } from 'zod'

// Stock count: an array of absolute counted levels per ingredient. Blank
// inputs are skipped at submit time, so quantities here are already present.
export const stockCountLineSchema = z.object({
  ingredient_id: z.string().uuid(),
  quantity: z.coerce.number({ invalid_type_error: 'number' }).nonnegative(),
})

export const stockCountSchema = z.object({
  lines: z.array(stockCountLineSchema).min(1, 'min_one_line'),
})

// Delivery: per-line ingredient + received quantity + unit cost paid +
// optional expiry date (creates one ingredient_batches row per line).
export const deliveryLineSchema = z.object({
  ingredient_id: z.string().uuid('required'),
  quantity: z.coerce
    .number({ invalid_type_error: 'number' })
    .positive('positive'),
  unit_cost: z.coerce
    .number({ invalid_type_error: 'number' })
    .nonnegative('positive'),
  // yyyy-mm-dd or empty. Optional in Phase 1, required in Phase 2.
  expiry_date: z.string().optional().or(z.literal('')),
  // Manufacturer's printed lot number, for recall traceability (optional).
  supplier_lot: z.string().max(120).optional().or(z.literal('')),
})

export const deliverySchema = z.object({
  supplier_id: z.string().optional(),
  notes: z.string().max(2000).optional().or(z.literal('')),
  lines: z.array(deliveryLineSchema).min(1, 'min_one_line'),
})

// Waste: single ingredient + quantity + category + optional notes/date.
export const wasteSchema = z.object({
  ingredient_id: z.string().uuid('required'),
  quantity: z.coerce
    .number({ invalid_type_error: 'number' })
    .positive('positive'),
  waste_category_id: z.string().uuid('required'),
  occurred_at: z.string().optional(),
  reason: z.string().max(300).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

export type StockCountInput = z.infer<typeof stockCountSchema>
export type DeliveryInput = z.infer<typeof deliverySchema>
export type WasteInput = z.infer<typeof wasteSchema>
