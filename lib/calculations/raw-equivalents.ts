import type { Ingredient } from '@/types/database'

// ── Raw-equivalent stock (preps reconciliation) ─────────────────────────────
// 5 kg of chicken breast turned into 10 portions of nuggets hasn't left the
// kitchen — it just changed shape. The count records "10 portions nuggets +
// 5 kg raw chicken"; this view explodes prepped (produced) goods back into the
// raw ingredients they embed, so the owner sees the FULL raw position:
//   chicken total = 5 kg direct + 10 portions × 0.5 kg/portion = 10 kg.
// Per-unit composition is derived from actual production-run history:
//   raw_per_output_unit = Σ quantity_used / Σ output_quantity per (output, raw)
// — a usage-weighted average across every run that made that good (voided runs
// keep a valid ratio, so they may stay in the average). Single-level: a prep
// used inside another prep is not recursively exploded (v1).

export interface RawEquivalentBreakdown {
  produced_id: string
  produced_name: string
  produced_unit: string
  // Current stock of the prepped good (e.g. 10 portions).
  produced_stock: number
  // Raw embedded per one unit of the prepped good (e.g. 0.5 kg per portion).
  raw_per_unit: number
  // produced_stock × raw_per_unit.
  raw_qty: number
}

export interface RawEquivalentLine {
  ingredient_id: string
  name: string
  unit: string
  direct_qty: number
  in_preps_qty: number
  total_qty: number
  breakdown: RawEquivalentBreakdown[]
}

export function computeRawEquivalents(
  ingredients: Pick<Ingredient, 'id' | 'name' | 'unit'>[],
  levels: Map<string, number>,
  runs: { id: string; output_ingredient_id: string; output_quantity: number }[],
  inputs: {
    production_run_id: string
    ingredient_id: string
    quantity_used: number
  }[]
): RawEquivalentLine[] {
  const byId = new Map(ingredients.map((i) => [i.id, i]))
  const runOutput = new Map(runs.map((r) => [r.id, r.output_ingredient_id]))

  // Σ output per produced good, Σ input per (produced good, raw ingredient).
  const totalOut = new Map<string, number>()
  for (const r of runs) {
    totalOut.set(
      r.output_ingredient_id,
      (totalOut.get(r.output_ingredient_id) ?? 0) + r.output_quantity
    )
  }
  const totalIn = new Map<string, Map<string, number>>()
  for (const i of inputs) {
    const out = runOutput.get(i.production_run_id)
    if (!out) continue
    const m = totalIn.get(out) ?? new Map<string, number>()
    m.set(i.ingredient_id, (m.get(i.ingredient_id) ?? 0) + i.quantity_used)
    totalIn.set(out, m)
  }

  // Explode each prepped good's CURRENT stock into embedded raw quantities.
  const perRaw = new Map<string, RawEquivalentBreakdown[]>()
  for (const [outId, rawMap] of totalIn) {
    const out = byId.get(outId)
    const outTotal = totalOut.get(outId) ?? 0
    const stock = levels.get(outId) ?? 0
    if (!out || outTotal <= 0 || stock <= 0) continue
    for (const [rawId, inTotal] of rawMap) {
      if (rawId === outId) continue // self-reference guard
      const perUnit = inTotal / outTotal
      if (perUnit <= 0) continue
      const arr = perRaw.get(rawId) ?? []
      arr.push({
        produced_id: outId,
        produced_name: out.name,
        produced_unit: out.unit,
        produced_stock: stock,
        raw_per_unit: perUnit,
        raw_qty: stock * perUnit,
      })
      perRaw.set(rawId, arr)
    }
  }

  const lines: RawEquivalentLine[] = []
  for (const [rawId, breakdown] of perRaw) {
    const raw = byId.get(rawId)
    if (!raw) continue
    const inPreps = breakdown.reduce((s, b) => s + b.raw_qty, 0)
    if (inPreps <= 1e-9) continue
    const direct = levels.get(rawId) ?? 0
    lines.push({
      ingredient_id: rawId,
      name: raw.name,
      unit: raw.unit,
      direct_qty: direct,
      in_preps_qty: inPreps,
      total_qty: direct + inPreps,
      breakdown: breakdown.sort((a, b) => b.raw_qty - a.raw_qty),
    })
  }
  return lines.sort((a, b) => b.in_preps_qty - a.in_preps_qty)
}
