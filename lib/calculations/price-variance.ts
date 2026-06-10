// Supplier price history + receiving price-variance (Tier B2). Pure — safe to
// import into both server queries and the client DeliveryForm. No DB access.

export interface PriceStat {
  // Most recent delivery unit cost.
  last_cost: number | null
  // Moving average of the last N deliveries (the recent "normal" price).
  avg_cost: number | null
  delivery_count: number
}

// |variance| above this flags a receiving price as an outlier (~10%).
export const PRICE_VARIANCE_THRESHOLD = 0.1
const DEFAULT_WINDOW = 5

// `costs` are delivery unit costs ordered NEWEST FIRST. last = the most recent;
// avg = mean of up to the last `windowN` deliveries.
export function computePriceStat(
  costs: number[],
  windowN = DEFAULT_WINDOW
): PriceStat {
  const valid = costs.filter((c) => Number.isFinite(c))
  if (valid.length === 0) {
    return { last_cost: null, avg_cost: null, delivery_count: 0 }
  }
  const window = valid.slice(0, windowN)
  const avg = window.reduce((s, c) => s + c, 0) / window.length
  return {
    last_cost: valid[0],
    avg_cost: Math.round(avg * 10000) / 10000,
    delivery_count: valid.length,
  }
}

// Signed fractional variance of a cost vs the moving average: (cost − avg) / avg.
// null when there's no baseline to compare against.
export function priceVariance(cost: number, avg: number | null): number | null {
  if (avg == null || avg === 0 || !Number.isFinite(cost)) return null
  return (cost - avg) / avg
}

// True when `cost` deviates from the moving average by more than `threshold`.
export function isPriceOutlier(
  cost: number,
  avg: number | null,
  threshold = PRICE_VARIANCE_THRESHOLD
): boolean {
  const v = priceVariance(cost, avg)
  return v != null && Math.abs(v) > threshold
}
