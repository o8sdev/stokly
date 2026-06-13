import type { PeriodReportLine } from './period-report'

const EPS = 0.0001

export interface ShrinkageAlert {
  ingredient_id: string
  name: string
  unit: string
  theoretical_qty: number
  usage_qty: number
  variance_qty: number
  variance_value: number
  variance_pct: number
}

// Flag ingredients used materially MORE than their recipes predict — the signal
// of over-portioning, unrecorded waste, or theft. variance_pct = how far actual
// usage exceeds theoretical, as a % of theoretical. Lines without a meaningful
// theoretical (no itemized sales for the period) are excluded, mirroring the
// report's own has_itemized_sales gate. Only over-usage counts (using LESS than
// predicted isn't shrinkage). Sorted by money lost, descending.
export function buildShrinkageAlerts(
  lines: PeriodReportLine[],
  thresholdPct: number
): ShrinkageAlert[] {
  const out: ShrinkageAlert[] = []
  for (const l of lines) {
    if (l.theoretical_qty <= EPS) continue
    if (l.variance_qty <= 0) continue
    const pct = (l.variance_qty / l.theoretical_qty) * 100
    if (pct <= thresholdPct) continue
    out.push({
      ingredient_id: l.ingredient_id,
      name: l.name,
      unit: l.unit,
      theoretical_qty: l.theoretical_qty,
      usage_qty: l.usage_qty,
      variance_qty: l.variance_qty,
      variance_value: l.variance_value,
      variance_pct: Math.round(pct * 10) / 10,
    })
  }
  return out.sort((a, b) => b.variance_value - a.variance_value)
}
