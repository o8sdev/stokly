/* Business-logic regression checks for the costing + stock engine. Pure
   functions only (no DB), so it runs anywhere: npx -y tsx scripts/qa-logic.ts
   Numbers are grounded in the Forno Vivo test menu where possible. */
import { deriveAllStockLevels, consumeFIFO } from '../lib/calculations/stock-level'
import {
  ingredientLineCost,
  costPerServing,
  foodCostPercent,
  suggestedPrice,
} from '../lib/calculations/food-cost'
import { toBaseUnit } from '../lib/constants/units'

let failed = 0
const approx = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps
function check(name: string, actual: unknown, expected: unknown, eps?: number) {
  const ok =
    typeof actual === 'number' && typeof expected === 'number'
      ? approx(actual, expected, eps ?? 1e-6)
      : JSON.stringify(actual) === JSON.stringify(expected)
  console.log(
    `${ok ? '✓' : '✗ FAIL'}  ${name} → ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`
  )
  if (!ok) failed++
}
const mv = (movement_type: string, quantity: number, is_absolute = false, t = '2026-01-01T00:00:00Z') =>
  ({ ingredient_id: 'x', movement_type, quantity, is_absolute, created_at: t } as never)

console.log('— COST —')
check('lineCost 0.25kg @1.80 (yield 1)', ingredientLineCost(0.25, 1.8, 1), 0.45)
check('lineCost yield 0.9 legacy path', ingredientLineCost(100, 5, 0.9), (100 / 0.9) * 5)
check('lineCost invalid yield 0 → 0', ingredientLineCost(1, 5, 0), 0)
check('lineCost yield >1 guarded → 0', ingredientLineCost(1, 5, 1.5), 0)
check('costPerServing total/size', costPerServing(20, 4), 5)
check('costPerServing size null → total', costPerServing(10, null), 10)
check('foodCostPercent is a %', foodCostPercent(3, 12), 25)
check('foodCostPercent salePrice 0 → 0', foodCostPercent(3, 0), 0)
check('suggestedPrice @30%', suggestedPrice(3, 30), 10)

console.log('\n— MARGHERITA (real menu) —')
const marg = 0.25 * 1.8 + 0.1 * 2.4 + 0.12 * 9.5 + 0.05 * 0.8 + 0.01 * 11.0
check('Margherita total cost', marg, 1.98, 1e-9)
check('Margherita food-cost %', foodCostPercent(marg, 9.0), 22, 1e-2)

console.log('\n— STOCK LEVEL (signs) —')
check('delivery adds', deriveAllStockLevels([mv('delivery', 500)]).get('x'), 500)
check('sale subtracts', deriveAllStockLevels([mv('count', 10), mv('sale', 3)]).get('x'), 7)
check('waste subtracts', deriveAllStockLevels([mv('count', 10), mv('waste', 3)]).get('x'), 7)
check('production in/out', deriveAllStockLevels([mv('count', 10), mv('production_input', 4), mv('production_output', 2)]).get('x'), 8)
check('expiry write-off subtracts', deriveAllStockLevels([mv('count', 10), mv('expiry_writeoff', 4)]).get('x'), 6)
check('transfer is no-op for total', deriveAllStockLevels([mv('count', 10), mv('transfer', 5)]).get('x'), 10)
check('count signed delta (negative ok)', deriveAllStockLevels([mv('count', 10), mv('count', -4)]).get('x'), 6)
check('is_absolute sets level', deriveAllStockLevels([mv('count', 10), mv('count', 99, true)]).get('x'), 99)
check('oversell → negative (not clamped)', deriveAllStockLevels([mv('count', 5), mv('sale', 8)]).get('x'), -3)

console.log('\n— Beer lifecycle (count→transfer→sale→delivery) —')
const beer = deriveAllStockLevels([
  mv('count', 48, false, '2026-06-16T10:00:00Z'),
  mv('count', 24, false, '2026-06-16T10:00:01Z'),
  mv('transfer', 5, false, '2026-06-16T10:30:00Z'),
  mv('sale', 10, false, '2026-06-16T11:00:00Z'),
  mv('delivery', 500, false, '2026-06-16T11:08:00Z'),
]).get('x')
check('Beer total = 48+24-10+500', beer, 562)

console.log('\n— FIFO (oldest first) —')
const fifo = consumeFIFO(
  [
    { id: 'b1', quantity_remaining: 10, unit_cost: 1.0 },
    { id: 'b2', quantity_remaining: 20, unit_cost: 1.2 },
  ] as never,
  25
)
check('FIFO drains b1 fully', fifo[0], { batch_id: 'b1', quantity_consumed: 10, unit_cost: 1.0 })
check('FIFO then b2 partial', fifo[1], { batch_id: 'b2', quantity_consumed: 15, unit_cost: 1.2 })
let threw = false
try {
  consumeFIFO([{ id: 'b1', quantity_remaining: 5, unit_cost: 1 }] as never, 10)
} catch {
  threw = true
}
check('FIFO insufficient throws', threw, true)

console.log('\n— UNIT CONVERSION —')
check('metric q→kq (500 q = 0.5 kq)', toBaseUnit(500, 'q', 'kq', null), 0.5)
check('pack factor (1 şüşə = 0.75 l)', toBaseUnit(1, 'şüşə', 'l', { şüşə: 0.75 }), 0.75)
check('same unit passthrough', toBaseUnit(3, 'kq', 'kq', null), 3)
check('unknown unit falls back to qty', toBaseUnit(3, 'qutu', 'kq', null), 3)

console.log(failed === 0 ? '\nALL LOGIC TESTS PASSED ✓' : `\n${failed} FAILURE(S) ✗`)
process.exit(failed === 0 ? 0 : 1)
