import type { RecipeIngredientLine } from '@/types/app'

// Calculate the cost of a single recipe ingredient line
// accounts for yield loss
export function ingredientLineCost(
  quantityRequired: number, // how much the recipe needs (in recipe unit)
  costPerUnit: number, // current price per unit
  yieldPercent: number // 0.0–1.0 (e.g. 0.78 = 78% yield)
): number {
  if (yieldPercent <= 0 || yieldPercent > 1) return 0
  // You need MORE raw ingredient to get the required usable quantity
  const rawQuantityNeeded = quantityRequired / yieldPercent
  return rawQuantityNeeded * costPerUnit
}

// Calculate total recipe cost from all ingredient lines
export function recipeTotalCost(lines: RecipeIngredientLine[]): number {
  return lines.reduce((sum, line) => sum + line.cost, 0)
}

// Calculate food cost percentage
export function foodCostPercent(
  recipeCost: number,
  salePrice: number
): number {
  if (salePrice <= 0) return 0
  return (recipeCost / salePrice) * 100
}

// Suggested sale price so that recipeCost is `targetPercent` of the price.
// Default target is 30% food cost.
export function suggestedPrice(
  recipeCost: number,
  targetPercent = 30
): number {
  if (targetPercent <= 0) return 0
  return recipeCost / (targetPercent / 100)
}

// Cost per serving given a recipe total and a serving count.
export function costPerServing(
  totalCost: number,
  servingSize: number | null
): number {
  if (!servingSize || servingSize <= 0) return totalCost
  return totalCost / servingSize
}

// Tailwind colour class for a food-cost percentage band:
//   green  < 30%
//   amber  30–40%
//   red    > 40%
export function foodCostColorClass(percent: number): string {
  if (percent <= 0) return 'text-muted-foreground'
  if (percent < 30) return 'text-green-600'
  if (percent <= 40) return 'text-amber-600'
  return 'text-red-600'
}
