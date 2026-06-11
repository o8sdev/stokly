import { z } from 'zod'

// Stock count: an array of absolute counted levels per ingredient. Blank
// inputs are skipped at submit time, so quantities here are already present.
export const stockCountLineSchema = z.object({
  ingredient_id: z.string().uuid(),
  quantity: z.coerce.number({ invalid_type_error: 'number' }).nonnegative(),
})

export const stockCountSchema = z.object({
  lines: z.array(stockCountLineSchema).min(1, 'min_one_line'),
  // Business date the count was taken (yyyy-mm-dd). Blank/missing → server now().
  count_date: z.string().optional(),
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
  // Supplier is chosen per line (the same ingredient may come from different
  // suppliers) and is always optional ("" = no supplier).
  supplier_id: z.string().optional().or(z.literal('')),
})

export const deliverySchema = z.object({
  // Which location the whole delivery is received into ("" → default dock).
  location_id: z.string().optional().or(z.literal('')),
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
  // Consumption point to deduct from ('' → tenant default).
  location_id: z.string().uuid().optional().or(z.literal('')),
  reason: z.string().max(300).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

// Transfer: move a quantity of one ingredient between two locations, with an
// optional new use-by date for the moved stock (e.g. when freezing).
export const transferSchema = z.object({
  ingredient_id: z.string().uuid('required'),
  from_location_id: z.string().uuid('required'),
  to_location_id: z.string().uuid('required'),
  quantity: z.coerce
    .number({ invalid_type_error: 'number' })
    .positive('positive'),
  expiry_date: z.string().optional().or(z.literal('')),
})

export type StockCountInput = z.infer<typeof stockCountSchema>
export type DeliveryInput = z.infer<typeof deliverySchema>
export type WasteInput = z.infer<typeof wasteSchema>
export type TransferInput = z.infer<typeof transferSchema>
