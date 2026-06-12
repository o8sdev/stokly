/* Calculation-layer audit harness. Exercises the unit-conversion and
   recipe/prep math against the REAL modules (no mocks of the logic itself).
   Run: npx -y tsx scripts/calc-audit.ts — exits non-zero on any failure. */
import { toBaseUnit, isConvertible, convertUnit } from '../lib/constants/units'
import {
  computeRecipesWithCost,
  subRecipeUnitCost,
  buildResolveContext,
} from '../lib/calculations/recipe-cost'
import { computeTheoreticalUsage } from '../lib/calculations/theoretical-usage'
import type { Recipe, RecipeIngredient } from '../types/database'
import type { IngredientWithConversions } from '../types/app'

let failed = 0
function check(name: string, actual: number | boolean, expected: number | boolean) {
  const ok =
    typeof actual === 'number' && typeof expected === 'number'
      ? Math.abs(actual - expected) < 1e-9
      : actual === expected
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗ FAIL'}  ${name}  →  ${actual}${ok ? '' : ` (expected ${expected})`}`)
}

// ── Builders (minimal rows; the calcs only read these fields) ────────────────
function ing(
  id: string,
  unit: string,
  cost: number,
  extra: Partial<IngredientWithConversions> = {}
): IngredientWithConversions {
  return {
    id,
    name: id,
    unit,
    cost_per_unit: cost,
    yield_percent: 1,
    unit_conversions: null,
    ...extra,
  } as IngredientWithConversions
}
function rec(id: string, extra: Partial<Recipe> = {}): Recipe {
  return {
    id,
    name: id,
    is_sub_recipe: false,
    serving_size: null,
    serving_unit: null,
    sale_price: null,
    yield_percent: 1,
    produced_ingredient_id: null,
    ...extra,
  } as Recipe
}
function line(
  recipe_id: string,
  src: { ingredient_id?: string; sub_recipe_id?: string },
  quantity: number,
  unit: string,
  yield_override: number | null = null
): RecipeIngredient {
  return {
    id: `${recipe_id}:${src.ingredient_id ?? src.sub_recipe_id}`,
    recipe_id,
    ingredient_id: src.ingredient_id ?? null,
    sub_recipe_id: src.sub_recipe_id ?? null,
    quantity,
    unit,
    yield_override,
  } as RecipeIngredient
}

// ── 1. Unit conversions ──────────────────────────────────────────────────────
console.log('\n— units —')
check('200 q → kq', toBaseUnit(200, 'q', 'kq'), 0.2)
check('1.5 kq → q', toBaseUnit(1.5, 'kq', 'q'), 1500)
check('250 ml → l', toBaseUnit(250, 'ml', 'l'), 0.25)
check('same unit passthrough', toBaseUnit(7, 'ədəd', 'ədəd'), 7)
check('custom factor: 2 şüşə → ml (×750)', toBaseUnit(2, 'şüşə', 'ml', { şüşə: 750 }), 1500)
check('mass→volume not convertible', convertUnit(1, 'q', 'ml') === null, true)
check('isConvertible q→kq', isConvertible('q', 'kq'), true)
check('isConvertible ədəd→kq (no factor)', isConvertible('ədəd', 'kq'), false)
check('isConvertible ədəd→kq (factor)', isConvertible('ədəd', 'kq', { ədəd: 0.05 }), true)

// ── 2. Recipe costing: conversion + yield + batch semantics ─────────────────
console.log('\n— costing —')
{
  // Chicken 10 AZN/kq; dish uses 200 q with 80% yield override → 0.2/0.8×10 = 2.5
  const I = [ing('chicken', 'kq', 10)]
  const R = [rec('dish', { sale_price: 10, serving_size: 4 })]
  const L = [line('dish', { ingredient_id: 'chicken' }, 800, 'q', 0.8)]
  const [row] = computeRecipesWithCost(I, R, L)
  check('batch cost (800 q @10/kq, yield .8)', row.totalCost, 10)
  check('cost per serving (batch/4)', row.costPerServing, 2.5)
  check('food-cost % uses PER-SERVING vs sale 10', row.foodCostPercent, 25)
}
{
  // Stocked prep with production cost: dish line = 2 servings × 1.2 AZN
  const I = [ing('prepIng', 'porsiya', 1.2), ing('flour', 'kq', 1)]
  const R = [
    rec('prep', { is_sub_recipe: true, serving_size: 10, produced_ingredient_id: 'prepIng' }),
    rec('dish', { sale_price: 10 }),
  ]
  const L = [
    line('prep', { ingredient_id: 'flour' }, 2, 'kq'),
    line('dish', { sub_recipe_id: 'prep' }, 2, 'porsiya'),
  ]
  const [, dish] = computeRecipesWithCost(I, R, L)
  check('stocked prep line costs prep cost (2×1.2)', dish.totalCost, 2.4)
}
{
  // Made-to-order prep (no production cost): batch 2 kq flour @1 = 2, size 10 → 0.2/serving
  const I = [ing('flour', 'kq', 1)]
  const R = [rec('prep', { is_sub_recipe: true, serving_size: 10 })]
  const L = [line('prep', { ingredient_id: 'flour' }, 2, 'kq')]
  const ctx = buildResolveContext(I, R, L)
  check('made-to-order unit cost (2/10)', subRecipeUnitCost('prep', ctx), 0.2)
}

// ── 3. Theoretical usage: batch dishes, conversions, preps ──────────────────
console.log('\n— theoretical usage —')
{
  // Batch dish: recipe makes 4 servings from 1 kq; selling 4 consumes 1 kq.
  const I = [ing('meat', 'kq', 8)]
  const R = [rec('dish', { serving_size: 4 })]
  const L = [line('dish', { ingredient_id: 'meat' }, 1, 'kq')]
  const u = computeTheoreticalUsage([{ recipe_id: 'dish', quantity: 4 }], I, R, L)
  check('4 servings of a 4-serving batch = 1 batch', u.usageByIngredient.get('meat') ?? 0, 1)
  const u1 = computeTheoreticalUsage([{ recipe_id: 'dish', quantity: 1 }], I, R, L)
  check('1 serving = quarter batch (0.25 kq)', u1.usageByIngredient.get('meat') ?? 0, 0.25)
}
{
  // Line-unit conversion at sale: 100 q line on a kq ingredient → 0.1 kq/serving.
  const I = [ing('butter', 'kq', 12)]
  const R = [rec('dish')]
  const L = [line('dish', { ingredient_id: 'butter' }, 100, 'q')]
  const u = computeTheoreticalUsage([{ recipe_id: 'dish', quantity: 2 }], I, R, L)
  check('2 × 100 q deducts 0.2 kq', u.usageByIngredient.get('butter') ?? 0, 0.2)
  check('theoretical COGS (0.2 × 12)', u.theoreticalCogs, 2.4)
}
{
  // Stocked prep: sale deducts the PREP, never the raw.
  const I = [ing('nuggetsIng', 'porsiya', 1.5), ing('chicken', 'kq', 9)]
  const R = [
    rec('nuggets', { is_sub_recipe: true, serving_size: 10, produced_ingredient_id: 'nuggetsIng' }),
    rec('plate', {}),
  ]
  const L = [
    line('nuggets', { ingredient_id: 'chicken' }, 5, 'kq'),
    line('plate', { sub_recipe_id: 'nuggets' }, 1, 'porsiya'),
  ]
  const u = computeTheoreticalUsage([{ recipe_id: 'plate', quantity: 3 }], I, R, L)
  check('sell 3 plates → prep −3', u.usageByIngredient.get('nuggetsIng') ?? 0, 3)
  check('raw chicken untouched', u.usageByIngredient.get('chicken') ?? 0, 0)
}
{
  // Made-to-order prep: explode to raw, normalized by batch size and yield.
  const I = [ing('chicken', 'kq', 9)]
  const R = [
    rec('sauce', { is_sub_recipe: true, serving_size: 10, yield_percent: 0.8 }),
    rec('plate', {}),
  ]
  const L = [
    line('sauce', { ingredient_id: 'chicken' }, 5, 'kq'),
    line('plate', { sub_recipe_id: 'sauce' }, 1, 'porsiya'),
  ]
  const u = computeTheoreticalUsage([{ recipe_id: 'plate', quantity: 2 }], I, R, L)
  // 2 servings ÷ (10 × 0.8) batches × 5 kq = 1.25
  check('made-to-order w/ yield .8 (2/(10×.8)×5)', u.usageByIngredient.get('chicken') ?? 0, 1.25)
}

console.log(failed === 0 ? '\nALL CHECKS PASSED' : `\n${failed} CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
