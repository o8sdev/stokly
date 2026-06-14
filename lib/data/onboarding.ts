import {
  getSuppliers,
  getIngredients,
  getStorageLocations,
  getRecipes,
  getStockMovements,
} from '@/lib/data/queries'

export type OnboardingStepKey =
  | 'sales_points'
  | 'suppliers'
  | 'ingredients'
  | 'recipes'
  | 'stock'

export interface OnboardingStep {
  key: OnboardingStepKey
  done: boolean
}

export interface OnboardingState {
  // Raw lists the wizard renders inside each step.
  suppliers: { id: string; name: string }[]
  ingredients: { id: string; name: string; unit: string }[]
  salesPoints: { id: string; name: string; isDefault: boolean }[]
  warehouseName: string | null
  recipeNames: string[]
  hasStock: boolean
  // Derived checklist (the dashboard card + the wizard rail share this).
  steps: OnboardingStep[]
  doneCount: number
  total: number
  allDone: boolean
}

// Single source of truth for first-run setup. Both the dashboard "Getting
// started" card and the /app/onboarding wizard derive their steps from here, so
// the two never drift. Every "done" is computed from real data, so the
// checklist is always accurate and resumable.
export async function getOnboardingState(
  tenantId: string
): Promise<OnboardingState> {
  const [suppliers, ingredients, locations, recipes, movements] =
    await Promise.all([
      getSuppliers(tenantId),
      getIngredients(tenantId),
      getStorageLocations(tenantId),
      getRecipes(tenantId),
      getStockMovements(tenantId),
    ])

  const salesPoints = locations
    .filter((l) => l.is_consumption_point)
    .map((l) => ({
      id: l.id,
      name: l.name,
      isDefault: l.is_default_consumption,
    }))
  const warehouse = locations.find((l) => l.is_default_receiving) ?? null
  const dishes = recipes.filter((r) => !r.is_sub_recipe)
  const hasStock = movements.some(
    (m) => m.movement_type === 'count' || m.movement_type === 'delivery'
  )

  const steps: OnboardingStep[] = [
    { key: 'sales_points', done: salesPoints.length > 0 },
    { key: 'suppliers', done: suppliers.length > 0 },
    { key: 'ingredients', done: ingredients.length > 0 },
    { key: 'recipes', done: dishes.length > 0 },
    { key: 'stock', done: hasStock },
  ]
  const doneCount = steps.filter((s) => s.done).length

  return {
    suppliers: suppliers.map((s) => ({ id: s.id, name: s.name })),
    ingredients: ingredients.map((i) => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
    })),
    salesPoints,
    warehouseName: warehouse?.name ?? null,
    recipeNames: dishes.map((r) => r.name),
    hasStock,
    steps,
    doneCount,
    total: steps.length,
    allDone: doneCount === steps.length,
  }
}

// Per-step destination — where a row jumps to when the owner clicks it.
export const ONBOARDING_STEP_HREF: Record<OnboardingStepKey, string> = {
  sales_points: '/app/settings/locations',
  suppliers: '/app/settings/suppliers',
  ingredients: '/app/ingredients',
  recipes: '/app/recipes/new',
  stock: '/app/inventory/count',
}
