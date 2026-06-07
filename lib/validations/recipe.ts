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
  notes: z.string().max(2000).optional().or(z.literal('')),
  lines: z.array(recipeLineSchema).min(1, 'min_one_line'),
})

export type RecipeInput = z.infer<typeof recipeSchema>
export type RecipeLineInput = z.infer<typeof recipeLineSchema>
