import type { Ingredient, StockMovement } from '@/types/database'

// ── Period report ────────────────────────────────────────────────────────
// A stock-count period spans (last count → this count]. The report is a
// classic usage/variance statement computed purely from inventory movement:
//   usage_qty = opening + delivered − closing   (net depletion incl. waste)
//   COGS      = Σ usage_qty × unit_cost
//   food_cost = COGS / sales_total × 100         (sales from daily_sales)
// Discrepancies are stored structured (not as fixed-language strings) so the
// UI renders them in the active locale.

export interface PeriodReportLine {
  ingredient_id: string
  name: string
  unit: string
  unit_cost: number
  opening_qty: number
  delivered_qty: number
  // In-house production: produced_qty added stock (production_output), consumed_qty
  // was raw drawn into a production run (production_input). Usage excludes the
  // latter so a raw ingredient's cost isn't double-counted (it's capitalised into
  // the produced item's cost) — the produced item then counts when it's sold.
  produced_qty: number
  consumed_qty: number
  waste_qty: number
  closing_qty: number
  usage_qty: number
  usage_value: number
  // Expected usage from itemized sales (recipe explosion). variance = actual −
  // theoretical: positive ⇒ used more than the recipes predict (over-portion /
  // waste / theft), negative ⇒ used less. Zero when sales aren't itemized.
  theoretical_qty: number
  variance_qty: number
  variance_value: number
}

export type DiscrepancyType = 'missing_sales' | 'negative_usage'

export interface Discrepancy {
  type: DiscrepancyType
  severity: 'warning' | 'info'
  dates?: string[]
  ingredient_id?: string
  ingredient_name?: string
}

export interface PeriodReportData {
  period_start: string
  period_end: string
  days_in_period: number
  sales_total: number
  cogs: number
  food_cost_percent: number | null
  opening_value: number
  closing_value: number
  deliveries_value: number
  waste_value: number
  // Theoretical (book) figures from itemized sales. Null/false/0 when no menu
  // items were recorded for the period.
  has_itemized_sales: boolean
  theoretical_cogs: number
  theoretical_food_cost_percent: number | null
  lines: PeriodReportLine[]
  discrepancies: Discrepancy[]
}

export interface PeriodReportInput {
  periodStart: string
  periodEnd: string
  daysInPeriod: number
  ingredients: Pick<Ingredient, 'id' | 'name' | 'unit' | 'cost_per_unit'>[]
  openingLevels: Map<string, number>
  closingLevels: Map<string, number>
  periodMovements: StockMovement[]
  salesTotal: number
  missingSalesDates: string[]
  // ingredient_id → expected base-unit usage from sold menu items.
  theoreticalUsage: Map<string, number>
  hasItemizedSales: boolean
}

const EPS = 1e-9
const round2 = (n: number): number => Math.round(n * 100) / 100

export function computePeriodReport(input: PeriodReportInput): PeriodReportData {
  const {
    ingredients,
    openingLevels,
    closingLevels,
    periodMovements,
    salesTotal,
    missingSalesDates,
    theoreticalUsage,
    hasItemizedSales,
    periodStart,
    periodEnd,
    daysInPeriod,
  } = input

  // Bucket the period's movements per ingredient.
  const delivered = new Map<string, number>() // purchases (delivery)
  const produced = new Map<string, number>() // made in-house (production_output)
  const consumedInProd = new Map<string, number>() // raw drawn into production
  const wasted = new Map<string, number>() // waste + expiry write-off
  for (const m of periodMovements) {
    if (m.movement_type === 'delivery') {
      delivered.set(m.ingredient_id, (delivered.get(m.ingredient_id) ?? 0) + m.quantity)
    } else if (m.movement_type === 'production_output') {
      produced.set(m.ingredient_id, (produced.get(m.ingredient_id) ?? 0) + m.quantity)
    } else if (m.movement_type === 'production_input') {
      consumedInProd.set(
        m.ingredient_id,
        (consumedInProd.get(m.ingredient_id) ?? 0) + Math.abs(m.quantity)
      )
    } else if (
      m.movement_type === 'waste' ||
      m.movement_type === 'expiry_writeoff'
    ) {
      wasted.set(
        m.ingredient_id,
        (wasted.get(m.ingredient_id) ?? 0) + Math.abs(m.quantity)
      )
    }
  }

  const lines: PeriodReportLine[] = []
  const discrepancies: Discrepancy[] = []
  let openingValue = 0
  let closingValue = 0
  let deliveriesValue = 0
  let wasteValue = 0
  let cogs = 0
  let theoreticalCogs = 0

  for (const ing of ingredients) {
    const opening_qty = openingLevels.get(ing.id) ?? 0
    const closing_qty = closingLevels.get(ing.id) ?? 0
    const delivered_qty = delivered.get(ing.id) ?? 0
    const produced_qty = produced.get(ing.id) ?? 0
    const consumed_qty = consumedInProd.get(ing.id) ?? 0
    const waste_qty = wasted.get(ing.id) ?? 0
    const theoretical_qty = theoreticalUsage.get(ing.id) ?? 0

    // Skip lines with no inventory presence/activity AND no expected usage.
    if (
      Math.abs(opening_qty) < EPS &&
      Math.abs(closing_qty) < EPS &&
      Math.abs(delivered_qty) < EPS &&
      Math.abs(produced_qty) < EPS &&
      Math.abs(consumed_qty) < EPS &&
      Math.abs(waste_qty) < EPS &&
      Math.abs(theoretical_qty) < EPS
    ) {
      continue
    }

    const cost = ing.cost_per_unit ?? 0
    // Usage to the outside (sale + waste + expiry) = opening + inbound − closing,
    // where inbound counts purchases AND in-house production, and raw drawn into
    // production is added back (it's capitalised into the produced item's cost).
    const usage_qty =
      opening_qty + delivered_qty + produced_qty - closing_qty - consumed_qty
    const usage_value = usage_qty * cost
    const variance_qty = usage_qty - theoretical_qty
    const variance_value = variance_qty * cost

    openingValue += opening_qty * cost
    closingValue += closing_qty * cost
    deliveriesValue += delivered_qty * cost
    wasteValue += waste_qty * cost
    cogs += usage_value
    theoreticalCogs += theoretical_qty * cost

    lines.push({
      ingredient_id: ing.id,
      name: ing.name,
      unit: ing.unit,
      unit_cost: round2(cost),
      opening_qty: round2(opening_qty),
      delivered_qty: round2(delivered_qty),
      produced_qty: round2(produced_qty),
      consumed_qty: round2(consumed_qty),
      waste_qty: round2(waste_qty),
      closing_qty: round2(closing_qty),
      usage_qty: round2(usage_qty),
      usage_value: round2(usage_value),
      theoretical_qty: round2(theoretical_qty),
      variance_qty: round2(variance_qty),
      variance_value: round2(variance_value),
    })

    // Negative usage ⇒ closing exceeds opening + deliveries: likely an
    // unrecorded delivery or a count error worth a second look.
    if (usage_qty < -EPS) {
      discrepancies.push({
        type: 'negative_usage',
        severity: 'info',
        ingredient_id: ing.id,
        ingredient_name: ing.name,
      })
    }
  }

  if (missingSalesDates.length > 0) {
    discrepancies.unshift({
      type: 'missing_sales',
      severity: 'warning',
      dates: missingSalesDates,
    })
  }

  lines.sort((a, b) => b.usage_value - a.usage_value)

  const cogsR = round2(cogs)
  const food_cost_percent =
    salesTotal > EPS ? round2((cogsR / salesTotal) * 100) : null

  const theoreticalCogsR = round2(theoreticalCogs)
  const theoretical_food_cost_percent =
    hasItemizedSales && salesTotal > EPS
      ? round2((theoreticalCogsR / salesTotal) * 100)
      : null

  return {
    period_start: periodStart,
    period_end: periodEnd,
    days_in_period: daysInPeriod,
    sales_total: round2(salesTotal),
    cogs: cogsR,
    food_cost_percent,
    opening_value: round2(openingValue),
    closing_value: round2(closingValue),
    deliveries_value: round2(deliveriesValue),
    waste_value: round2(wasteValue),
    has_itemized_sales: hasItemizedSales,
    theoretical_cogs: theoreticalCogsR,
    theoretical_food_cost_percent,
    lines,
    discrepancies,
  }
}

export interface PeriodKpis {
  avg_inventory_value: number
  // COGS ÷ avg inventory value — how many times stock turned over in the period.
  inventory_turnover: number | null
  // avg inventory ÷ COGS × days_in_period — days of stock on hand at this rate.
  days_on_hand: number | null
  // waste_value ÷ COGS × 100.
  waste_percent: number | null
}

// Period KPIs (Tier C1/C2/C3), derived purely from a computed PeriodReportData —
// no extra queries, so they work on already-stored reports too.
export function computePeriodKpis(data: PeriodReportData): PeriodKpis {
  const avg = round2((data.opening_value + data.closing_value) / 2)
  return {
    avg_inventory_value: avg,
    inventory_turnover: avg > EPS ? round2(data.cogs / avg) : null,
    days_on_hand:
      data.cogs > EPS && data.days_in_period > 0
        ? round2((avg / data.cogs) * data.days_in_period)
        : null,
    waste_percent:
      data.cogs > EPS ? round2((data.waste_value / data.cogs) * 100) : null,
  }
}
