import { createClient } from '@/lib/supabase/server'
import { deriveStockLevelsAsOf } from '@/lib/calculations/stock-level'
import { computePeriodReport } from '@/lib/calculations/period-report'
import type { Ingredient, StockMovement } from '@/types/database'

// ── Owner's overview ──────────────────────────────────────────────────────
// A period-scoped command center. It reruns the same usage/variance math as the
// stock-count period report (computePeriodReport) but over an arbitrary rolling
// date range the owner picks, plus the immediately-preceding equal-length window
// for at-a-glance deltas. No new costing logic — just a date-range lens on it.

type SB = ReturnType<typeof createClient>

export type RangePreset = '7d' | '30d' | 'this_month' | 'last_month'
export const RANGE_PRESETS: RangePreset[] = [
  '7d',
  '30d',
  'this_month',
  'last_month',
]

const round2 = (n: number): number => Math.round(n * 100) / 100

// ── Date helpers (UTC, 'YYYY-MM-DD') — same convention as lib/data/counts.ts ──
function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}
function ms(d: string): number {
  return Date.parse(`${d}T00:00:00.000Z`)
}
function addDays(d: string, n: number): string {
  const x = new Date(`${d}T00:00:00.000Z`)
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}
function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.round((ms(b) - ms(a)) / 86_400_000))
}
function enumerateDates(start: string, end: string): string[] {
  const out: string[] = []
  if (ms(start) > ms(end)) return out
  let cur = start
  for (let i = 0; i < 400 && ms(cur) <= ms(end); i++) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

export interface ResolvedRange {
  preset: RangePreset
  from: string
  to: string
}

// Map a preset to an inclusive [from, to] window, anchored on today.
export function resolveRange(
  preset: RangePreset,
  today = todayStr()
): ResolvedRange {
  switch (preset) {
    case '7d':
      return { preset, from: addDays(today, -6), to: today }
    case '30d':
      return { preset, from: addDays(today, -29), to: today }
    case 'last_month': {
      const firstThis = `${today.slice(0, 7)}-01`
      const to = addDays(firstThis, -1)
      const from = `${to.slice(0, 7)}-01`
      return { preset, from, to }
    }
    case 'this_month':
    default:
      return { preset: 'this_month', from: `${today.slice(0, 7)}-01`, to: today }
  }
}

// The equal-length window ending the day before `from` — the comparison baseline.
export function previousRange(
  from: string,
  to: string
): { from: string; to: string } {
  const span = daysBetween(from, to)
  const prevTo = addDays(from, -1)
  const prevFrom = addDays(prevTo, -span)
  return { from: prevFrom, to: prevTo }
}

export interface OverviewKpis {
  revenue: number
  cogs: number
  foodCostPercent: number | null
  grossProfit: number
  purchases: number
  wasteValue: number
  inventoryValue: number // closing stock value as of `to`
}

export interface OverviewResult {
  from: string
  to: string
  current: OverviewKpis
  previous: OverviewKpis
  dailySales: { date: string; amount: number }[]
}

async function salesTotalInRange(
  supabase: SB,
  tenantId: string,
  from: string,
  to: string
): Promise<number> {
  const { data } = await supabase
    .from('daily_sales')
    .select('total_amount')
    .eq('tenant_id', tenantId)
    .gte('sale_date', from)
    .lte('sale_date', to)
  return (data ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0)
}

async function dailySalesInRange(
  supabase: SB,
  tenantId: string,
  from: string,
  to: string
): Promise<{ date: string; amount: number }[]> {
  const { data } = await supabase
    .from('daily_sales')
    .select('sale_date, total_amount')
    .eq('tenant_id', tenantId)
    .gte('sale_date', from)
    .lte('sale_date', to)
  const byDate = new Map<string, number>()
  for (const r of data ?? []) {
    const d = String(r.sale_date)
    byDate.set(d, (byDate.get(d) ?? 0) + Number(r.total_amount ?? 0))
  }
  // Fill every day in the window so the trend has no gaps.
  return enumerateDates(from, to).map((date) => ({
    date,
    amount: round2(byDate.get(date) ?? 0),
  }))
}

// Compute the KPIs for one window from movements already in memory. Opening =
// stock at the start of `from`, closing = stock at the end of `to`; the window's
// movements drive deliveries/production/waste. Food-cost % needs sales, so it's
// null until the owner records sales for the range.
function computeWindow(
  movements: StockMovement[],
  ingredients: Ingredient[],
  from: string,
  to: string,
  salesTotal: number
): OverviewKpis {
  const openingAsOf = `${from}T00:00:00.000Z`
  const closingAsOf = `${to}T23:59:59.999Z`
  const openingLevels = deriveStockLevelsAsOf(movements, openingAsOf)
  const closingLevels = deriveStockLevelsAsOf(movements, closingAsOf)
  const openMs = Date.parse(openingAsOf)
  const closeMs = Date.parse(closingAsOf)
  const periodMovements = movements.filter((m) => {
    const t = new Date(m.created_at).getTime()
    return t > openMs && t <= closeMs
  })

  const report = computePeriodReport({
    periodStart: from,
    periodEnd: to,
    daysInPeriod: daysBetween(from, to) + 1,
    ingredients,
    openingLevels,
    closingLevels,
    periodMovements,
    salesTotal,
    missingSalesDates: [],
    // Theoretical usage is out of scope for the at-a-glance KPIs (it needs the
    // snapshot/explosion machinery); the actual COGS below comes from inventory
    // movement, which is what the owner's food-cost % is built on.
    theoreticalUsage: new Map(),
    hasItemizedSales: false,
  })

  return {
    revenue: report.sales_total,
    cogs: report.cogs,
    foodCostPercent: report.food_cost_percent,
    grossProfit: round2(report.sales_total - report.cogs),
    purchases: report.deliveries_value,
    wasteValue: report.waste_value,
    inventoryValue: report.closing_value,
  }
}

// Owner's overview for a rolling [from, to] range, with the previous equal-length
// window for deltas and a per-day sales series for the trend chart. `movements`
// and `ingredients` are passed in (the dashboard already loads them) to avoid a
// second full movements fetch.
export async function getOverview(
  tenantId: string,
  range: { from: string; to: string },
  data: { movements: StockMovement[]; ingredients: Ingredient[] }
): Promise<OverviewResult> {
  const supabase = createClient()
  const prev = previousRange(range.from, range.to)

  const [curSales, prevSales, dailySales] = await Promise.all([
    salesTotalInRange(supabase, tenantId, range.from, range.to),
    salesTotalInRange(supabase, tenantId, prev.from, prev.to),
    dailySalesInRange(supabase, tenantId, range.from, range.to),
  ])

  return {
    from: range.from,
    to: range.to,
    current: computeWindow(
      data.movements,
      data.ingredients,
      range.from,
      range.to,
      curSales
    ),
    previous: computeWindow(
      data.movements,
      data.ingredients,
      prev.from,
      prev.to,
      prevSales
    ),
    dailySales,
  }
}
