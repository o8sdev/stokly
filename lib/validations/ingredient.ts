import { z } from 'zod'

export const ingredientSchema = z.object({
  name: z.string().min(1, 'required').max(200),
  name_az: z.string().max(200).optional().or(z.literal('')),
  name_ru: z.string().max(200).optional().or(z.literal('')),
  unit: z.string().min(1, 'required').max(50),
  cost_per_unit: z.coerce
    .number({ invalid_type_error: 'number' })
    .nonnegative('positive'),
  // Stored as 0–1 fraction; the form collects a 0–100 percentage and converts.
  yield_percent: z.coerce
    .number({ invalid_type_error: 'number' })
    .positive('positive')
    .max(1, 'max'),
  supplier_id: z.string().uuid().nullable().optional(),
  low_stock_threshold: z.coerce
    .number({ invalid_type_error: 'number' })
    .nonnegative('positive')
    .nullable()
    .optional(),
  // Build-to-par target (migration 034). low_stock_threshold is the reorder
  // trigger; par_level is the top-up target the shopping list orders toward.
  par_level: z.coerce
    .number({ invalid_type_error: 'number' })
    .nonnegative('positive')
    .nullable()
    .optional(),
  // Produced-good fields (migration 003).
  is_produced: z.boolean().default(false),
  default_shelf_life_days: z.coerce
    .number({ invalid_type_error: 'number' })
    .int()
    .positive('positive')
    .nullable()
    .optional(),
  storage_location: z.string().max(100).nullable().optional(),
})

export type IngredientInput = z.infer<typeof ingredientSchema>

// Form-facing schema where yield is a 0–100 percentage value.
export const ingredientFormSchema = z.object({
  name: z.string().min(1, 'required').max(200),
  name_az: z.string().max(200).optional().or(z.literal('')),
  name_ru: z.string().max(200).optional().or(z.literal('')),
  unit: z.string().min(1, 'required').max(50),
  cost_per_unit: z.coerce
    .number({ invalid_type_error: 'number' })
    .nonnegative('positive'),
  yield_percent_display: z.coerce
    .number({ invalid_type_error: 'number' })
    .positive('positive')
    .max(100, 'max'),
  supplier_id: z.string().optional(),
  low_stock_threshold: z
    .union([z.coerce.number().nonnegative(), z.literal('')])
    .optional(),
  par_level: z
    .union([z.coerce.number().nonnegative(), z.literal('')])
    .optional(),
})

export type IngredientFormInput = z.infer<typeof ingredientFormSchema>
