import type { PurchaseLogEntry } from '@/lib/data/queries'
import type { StockMovement } from '@/types/database'
import {
  computePriceStat,
  priceVariance,
  PRICE_VARIANCE_THRESHOLD,
} from './price-variance'

const r2 = (n: number): number => Math.round(n * 100) / 100
const r4 = (n: number): number => Math.round(n * 10000) / 10000

// ── Supplier comparison (for a period) ─────────────────────────────────────
export interface SupplierStat {
  supplier: string // supplier name, or '' for "no supplier"
  deliveries: number
  qty: number
  spend: number
  avg: number // weighted unit cost = spend / qty
  min: number
  max: number
  last: number // most recent delivery's unit cost
}

export interface IngredientComparison {
  ingredientId: string
  name: string
  unit: string
  suppliers: SupplierStat[] // cheapest average first
  cheapestSupplier: string | null
  cheapestAvg: number | null
  paidAvg: number // weighted across all suppliers
  // What you could have saved buying everything from the cheapest supplier:
  // periodQty × (paidAvg − cheapestAvg), never negative.
  potentialSaving: number
}

// Per ingredient, break deliveries down by supplier (avg/min/max/last) and rank
// suppliers cheapest-first; surface the saving from consolidating on the cheapest.
export function buildSupplierComparison(
  purchases: PurchaseLogEntry[]
): IngredientComparison[] {
  const byIng = new Map<string, PurchaseLogEntry[]>()
  for (const p of purchases) {
    if (!(p.unit_cost > 0) || !(p.quantity > 0)) continue
    const arr = byIng.get(p.ingredient_id) ?? []
    arr.push(p)
    byIng.set(p.ingredient_id, arr)
  }

  const out: IngredientComparison[] = []
  for (const [ingredientId, list] of byIng) {
    const bySup = new Map<
      string,
      { qty: number; spend: number; n: number; min: number; max: number; last: number; lastAt: number }
    >()
    for (const p of list) {
      const key = p.supplier_name ?? ''
      const cur =
        bySup.get(key) ??
        { qty: 0, spend: 0, n: 0, min: Infinity, max: -Infinity, last: 0, lastAt: -Infinity }
      cur.qty += p.quantity
      cur.spend += p.quantity * p.unit_cost
      cur.n += 1
      cur.min = Math.min(cur.min, p.unit_cost)
      cur.max = Math.max(cur.max, p.unit_cost)
      const t = Date.parse(p.created_at)
      if (t >= cur.lastAt) {
        cur.lastAt = t
        cur.last = p.unit_cost
      }
      bySup.set(key, cur)
    }

    const suppliers: SupplierStat[] = [...bySup.entries()]
      .map(([supplier, s]) => ({
        supplier,
        deliveries: s.n,
        qty: r2(s.qty),
        spend: r2(s.spend),
        avg: r4(s.spend / s.qty),
        min: r4(s.min),
        max: r4(s.max),
        last: r4(s.last),
      }))
      .sort((a, b) => a.avg - b.avg)

    const totalQty = suppliers.reduce((s, x) => s + x.qty, 0)
    const totalSpend = suppliers.reduce((s, x) => s + x.spend, 0)
    const paidAvg = totalQty > 0 ? totalSpend / totalQty : 0
    const cheapestAvg = suppliers.length > 0 ? suppliers[0].avg : null
    const potentialSaving =
      cheapestAvg != null ? Math.max(0, r2(totalQty * (paidAvg - cheapestAvg))) : 0

    out.push({
      ingredientId,
      name: list[0].ingredient_name,
      unit: list[0].unit,
      suppliers,
      cheapestSupplier: suppliers.length > 0 ? suppliers[0].supplier : null,
      cheapestAvg,
      paidAvg: r4(paidAvg),
      potentialSaving,
    })
  }

  // Biggest savings opportunity first, then alphabetical.
  out.sort(
    (a, b) => b.potentialSaving - a.potentialSaving || a.name.localeCompare(b.name)
  )
  return out
}

// ── Monthly price trend (seasonality) ──────────────────────────────────────
export interface MonthlyPoint {
  month: string // YYYY-MM
  avg: number // weighted unit cost that month
  count: number
}

type TrendInput = Pick<
  PurchaseLogEntry,
  'ingredient_id' | 'unit_cost' | 'quantity' | 'created_at'
>

export function buildMonthlyTrend(
  purchases: TrendInput[],
  ingredientId: string
): MonthlyPoint[] {
  const byMonth = new Map<string, { qty: number; spend: number; n: number }>()
  for (const p of purchases) {
    if (p.ingredient_id !== ingredientId) continue
    if (!(p.unit_cost > 0) || !(p.quantity > 0)) continue
    const m = p.created_at.slice(0, 7)
    const cur = byMonth.get(m) ?? { qty: 0, spend: 0, n: 0 }
    cur.qty += p.quantity
    cur.spend += p.quantity * p.unit_cost
    cur.n += 1
    byMonth.set(m, cur)
  }
  return [...byMonth.entries()]
    .map(([month, s]) => ({ month, avg: r4(s.spend / s.qty), count: s.n }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

// Per-ingredient monthly trend for every ingredient with purchases (drives the
// report's trend picker without shipping the raw purchase rows to the client).
export function buildAllTrends(
  purchases: TrendInput[]
): Record<string, MonthlyPoint[]> {
  const ids = new Set(purchases.map((p) => p.ingredient_id))
  const out: Record<string, MonthlyPoint[]> = {}
  for (const id of ids) out[id] = buildMonthlyTrend(purchases, id)
  return out
}

// ── Price-rise alerts ──────────────────────────────────────────────────────
export interface PriceAlert {
  ingredientId: string
  name: string
  unit: string
  last: number
  avg: number
  variancePct: number // (last − avg) / avg × 100, positive = a rise
}

// Ingredients whose latest delivery price is meaningfully above their recent
// moving average. Computed over ALL deliveries (not just the period) so a rise
// is judged against the normal recent price.
export function buildPriceAlerts(
  movements: StockMovement[],
  ingredients: { id: string; name: string; unit: string }[],
  threshold = PRICE_VARIANCE_THRESHOLD
): PriceAlert[] {
  const byIng = new Map<string, number[]>()
  for (const m of movements) {
    if (m.movement_type !== 'delivery' || m.unit_cost == null) continue
    const arr = byIng.get(m.ingredient_id) ?? []
    arr.push(Number(m.unit_cost)) // movements are newest-first
    byIng.set(m.ingredient_id, arr)
  }
  const meta = new Map(ingredients.map((i) => [i.id, i]))
  const alerts: PriceAlert[] = []
  for (const [id, costs] of byIng) {
    const stat = computePriceStat(costs)
    const v = priceVariance(stat.last_cost ?? 0, stat.avg_cost)
    if (stat.last_cost != null && v != null && v > threshold) {
      const m = meta.get(id)
      alerts.push({
        ingredientId: id,
        name: m?.name ?? '—',
        unit: m?.unit ?? '',
        last: stat.last_cost,
        avg: stat.avg_cost ?? 0,
        variancePct: Math.round(v * 1000) / 10,
      })
    }
  }
  return alerts.sort((a, b) => b.variancePct - a.variancePct)
}
