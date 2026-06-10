import type { Ingredient } from '@/types/database'

// A single line on the build-to-par shopping list.
export interface ShoppingItem {
  ingredient_id: string
  name: string
  unit: string
  on_hand: number
  par_level: number | null
  low_stock_threshold: number | null
  // max(0, par_level − on_hand); 0 when no par is set.
  suggested_qty: number
  // Last paid price (most recent delivery) or the ingredient's current cost.
  last_cost: number
  // suggested_qty × last_cost.
  est_cost: number
  below_par: boolean
  // At/below the reorder threshold — surfaced as "urgent".
  below_threshold: boolean
  supplier_id: string | null
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000
const round2 = (n: number): number => Math.round(n * 100) / 100

// Build the build-to-par order list: every ingredient that is below its par
// level OR at/below its reorder threshold. suggested_qty tops it back up to par;
// a below-threshold item with no par still appears (qty 0, left for the user) so
// an out-of-stock item is never silently missing from the order.
//
// Pure: takes already-derived stock levels and last-cost lookups so it stays
// trivially testable and free of DB access (the invariant source of stock is
// deriveStockLevel — see lib/calculations/stock-level.ts).
export function computeShoppingList(
  ingredients: Ingredient[],
  stockLevels: Map<string, number>,
  lastCosts: Map<string, number>
): ShoppingItem[] {
  const items: ShoppingItem[] = []

  for (const ing of ingredients) {
    const onHand = stockLevels.get(ing.id) ?? 0
    const par = ing.par_level
    const threshold = ing.low_stock_threshold
    const belowPar = par != null && onHand < par
    const belowThreshold = threshold != null && onHand <= threshold
    if (!belowPar && !belowThreshold) continue

    const suggested = par != null ? round3(Math.max(0, par - onHand)) : 0
    const lastCost = lastCosts.get(ing.id) ?? ing.cost_per_unit ?? 0

    items.push({
      ingredient_id: ing.id,
      name: ing.name,
      unit: ing.unit,
      on_hand: round3(onHand),
      par_level: par,
      low_stock_threshold: threshold,
      suggested_qty: suggested,
      last_cost: lastCost,
      est_cost: round2(suggested * lastCost),
      below_par: belowPar,
      below_threshold: belowThreshold,
      supplier_id: ing.supplier_id,
    })
  }

  // Urgent (below reorder threshold) first, then alphabetical.
  return items.sort((a, b) => {
    if (a.below_threshold !== b.below_threshold) return a.below_threshold ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
