// Menu engineering (Tier C6). Classify each priced menu item by popularity
// (sales-mix share) and profitability (contribution margin) into the classic
// 2×2: stars / plowhorses / puzzles / dogs. Pure — caller supplies sold units +
// plate cost (from computeRecipesWithCost). "High" = at or above the median.

export type MenuClass = 'star' | 'plowhorse' | 'puzzle' | 'dog'

export interface MenuItemInput {
  recipe_id: string
  name: string
  units_sold: number
  sale_price: number
  plate_cost: number
}

export interface MenuItem extends MenuItemInput {
  popularity: number // 0–1 share of total units sold
  margin: number // contribution margin = sale_price − plate_cost
  revenue: number // units_sold × sale_price
  margin_total: number // units_sold × margin
  high_popularity: boolean
  high_margin: boolean
  klass: MenuClass
}

export interface MenuEngineering {
  items: MenuItem[] // sorted by revenue desc
  total_units: number
  median_popularity: number
  median_margin: number
  counts: Record<MenuClass, number>
}

const round2 = (n: number): number => Math.round(n * 100) / 100
const round4 = (n: number): number => Math.round(n * 10000) / 10000

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function classify(highPop: boolean, highMargin: boolean): MenuClass {
  if (highPop) return highMargin ? 'star' : 'plowhorse'
  return highMargin ? 'puzzle' : 'dog'
}

export function computeMenuEngineering(
  inputs: MenuItemInput[]
): MenuEngineering {
  const totalUnits = inputs.reduce((s, i) => s + i.units_sold, 0)

  const withMetrics = inputs.map((i) => ({
    ...i,
    popularity: totalUnits > 0 ? round4(i.units_sold / totalUnits) : 0,
    margin: round2(i.sale_price - i.plate_cost),
    revenue: round2(i.units_sold * i.sale_price),
    margin_total: round2(i.units_sold * (i.sale_price - i.plate_cost)),
  }))

  const medPop = median(withMetrics.map((i) => i.popularity))
  const medMargin = median(withMetrics.map((i) => i.margin))

  const items: MenuItem[] = withMetrics
    .map((i) => {
      const highPop = i.popularity >= medPop
      const highMargin = i.margin >= medMargin
      return {
        ...i,
        high_popularity: highPop,
        high_margin: highMargin,
        klass: classify(highPop, highMargin),
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  const counts: Record<MenuClass, number> = {
    star: 0,
    plowhorse: 0,
    puzzle: 0,
    dog: 0,
  }
  for (const i of items) counts[i.klass] += 1

  return {
    items,
    total_units: totalUnits,
    median_popularity: medPop,
    median_margin: medMargin,
    counts,
  }
}
