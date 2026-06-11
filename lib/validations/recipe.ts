import { z } from 'zod'

export const recipeLineSchema = z
  .object({
    kind: z.enum(['ingredient', 'sub_recipe']),
    sourceId: z.string().uuid('required'),
    quantity: z.coerce
      .number({ invalid_type_error: 'number' })
      .positive('positive'),
    unit: z.string().min(1, 'required').max(50),
    yieldOverride: z
      .union([z.coerce.number().positive().max(100), z.literal('')])
      .optional(),
  })
  .strict()

export const recipeSchema = z.object({
  name: z.string().min(1, 'required').max(200),
  name_az: z.string().max(200).optional().or(z.literal('')),
  name_ru: z.string().max(200).optional().or(z.literal('')),
  is_sub_recipe: z.boolean().default(false),
  serving_size: z
    .union([z.coerce.number().positive(), z.literal('')])
    .optional(),
  serving_unit: z.string().max(50).optional().or(z.literal('')),
  sale_price: z
    .union([z.coerce.number().nonnegative(), z.literal('')])
    .optional(),
  // Sub-recipe yield as a 0–100 percentage (the action converts to a 0–1
  // fraction; default 1 = 100%). Only meaningful for sub-recipes.
  yield_percent: z
    .union([z.coerce.number().positive().max(100), z.literal('')])
    .optional(),
  // Which consumption point this menu item draws from ('' = tenant default).
  consumption_location_id: z.string().uuid().optional().or(z.literal('')),
  // Menu section (breakfast, soups, …); '' = uncategorised.
  category_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  lines: z.array(recipeLineSchema).min(1, 'min_one_line'),
})

export type RecipeInput = z.infer<typeof recipeSchema>
export type RecipeLineInput = z.infer<typeof recipeLineSchema>
