import type { IngredientBatch } from '@/types/app'

// Stock aging (Tier C5). Bucket active batches by how long they've been on hand
// (today − received_date) into 0–7 / 8–30 / 31+ day bands, with value at risk
// (old stock + near-expiry). Pure: takes `nowMs` so it's deterministic/testable.

export type AgeBand = '0-7' | '8-30' | '31+'

export interface AgingBatch {
  id: string
  ingredient_id: string
  batch_code: string | null
  quantity_remaining: number
  unit: string
  unit_cost: number
  value: number
  received_date: string
  age_days: number
  band: AgeBand
  expiry_date: string | null
  days_to_expiry: number | null
  near_expiry: boolean
}

export interface AgingBandSummary {
  band: AgeBand
  count: number
  value: number
}

export interface StockAging {
  batches: AgingBatch[] // oldest first
  bands: AgingBandSummary[] // always [0-7, 8-30, 31+]
  total_value: number
  // Value in the 31+ band OR flagged near-expiry — the stock most at risk.
  at_risk_value: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const round2 = (n: number): number => Math.round(n * 100) / 100

function bandOf(ageDays: number): AgeBand {
  if (ageDays <= 7) return '0-7'
  if (ageDays <= 30) return '8-30'
  return '31+'
}

export function computeStockAging(
  batches: IngredientBatch[],
  nowMs: number,
  nearExpiryDays = 7
): StockAging {
  const rows: AgingBatch[] = []

  for (const b of batches) {
    if (b.status !== 'active' || b.quantity_remaining <= 0) continue
    const ageDays = Math.max(
      0,
      Math.floor((nowMs - new Date(b.received_date).getTime()) / DAY_MS)
    )
    const daysToExpiry =
      b.expiry_date != null
        ? Math.ceil((new Date(b.expiry_date).getTime() - nowMs) / DAY_MS)
        : null
    rows.push({
      id: b.id,
      ingredient_id: b.ingredient_id,
      batch_code: b.batch_code,
      quantity_remaining: b.quantity_remaining,
      unit: b.unit,
      unit_cost: b.unit_cost,
      value: round2(b.quantity_remaining * b.unit_cost),
      received_date: b.received_date,
      age_days: ageDays,
      band: bandOf(ageDays),
      expiry_date: b.expiry_date,
      days_to_expiry: daysToExpiry,
      near_expiry: daysToExpiry != null && daysToExpiry <= nearExpiryDays,
    })
  }

  rows.sort((a, b) => b.age_days - a.age_days)

  const bands: AgingBandSummary[] = (['0-7', '8-30', '31+'] as AgeBand[]).map(
    (band) => {
      const inBand = rows.filter((r) => r.band === band)
      return {
        band,
        count: inBand.length,
        value: round2(inBand.reduce((s, r) => s + r.value, 0)),
      }
    }
  )

  return {
    batches: rows,
    bands,
    total_value: round2(rows.reduce((s, r) => s + r.value, 0)),
    at_risk_value: round2(
      rows
        .filter((r) => r.band === '31+' || r.near_expiry)
        .reduce((s, r) => s + r.value, 0)
    ),
  }
}
