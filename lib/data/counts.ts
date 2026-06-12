import { createClient } from '@/lib/supabase/server'
import {
  getIngredients,
  getStockMovements,
  getTenant,
  getRecipes,
  getRecipeIngredients,
} from '@/lib/data/queries'
import { deriveStockLevelsAsOf } from '@/lib/calculations/stock-level'
import {
  computePeriodReport,
  type PeriodReportData,
} from '@/lib/calculations/period-report'
import { computeTheoreticalUsage } from '@/lib/calculations/theoretical-usage'
import type { CountPeriod, Json } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type DB = SupabaseClient<Database>

// ── Date helpers (UTC, 'YYYY-MM-DD') ─────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}
function ms(dateStr: string): number {
  return Date.parse(`${dateStr}T00:00:00.000Z`)
}
function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function daysBetween(start: string, end: string): number {
  return Math.max(0, Math.round((ms(end) - ms(start)) / 86_400_000))
}
function enumerateDates(start: string, end: string): string[] {
  const out: string[] = []
  if (ms(start) > ms(end)) return out
  let cur = start
  for (let i = 0; i < 3650 && ms(cur) <= ms(end); i++) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

// ── Boundaries & sales windows ───────────────────────────────────────────
export interface PreCountInfo {
  periodStart: string
  periodEnd: string
  daysInPeriod: number
  cycleDays: number
  hasPreviousCount: boolean
  salesWindowStart: string | null
  salesWindowEnd: string | null
  missingSalesDates: string[]
  todayHasSales: boolean
}

export interface LastCountInfo {
  lastCountDate: string | null
  daysSince: number | null
  cycleDays: number
}

async function getLastCountPeriod(
  supabase: DB,
  tenantId: string
): Promise<CountPeriod | null> {
  const { data } = await supabase
    .from('count_periods')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('counted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as CountPeriod | null) ?? null
}

// Earliest stock activity for the tenant — the opening boundary of the very
// first count period. Falls back to the tenant's creation date.
async function getOpeningDate(supabase: DB, tenantId: string): Promise<string> {
  const { data } = await supabase
    .from('stock_movements')
    .select('created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (data?.created_at) return String(data.created_at).slice(0, 10)
  const tenant = await getTenant(tenantId)
  return (tenant?.created_at ?? new Date().toISOString()).slice(0, 10)
}

// Days a period newly covers = (previous count, today]. The very first count is
// a baseline that establishes opening inventory — there were no sales before any
// stock existed, so it has NO sales window (no missing-sales nag, no COGS/food-
// cost, no theoretical usage). Sales tracking begins after the baseline count.
function salesWindow(
  periodStart: string,
  periodEnd: string,
  hasPrev: boolean
): { start: string; end: string } | null {
  if (!hasPrev) return null
  const start = addDays(periodStart, 1)
  if (ms(start) > ms(periodEnd)) return null
  return { start, end: periodEnd }
}

async function salesDatesInRange(
  supabase: DB,
  tenantId: string,
  start: string,
  end: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from('daily_sales')
    .select('sale_date')
    .eq('tenant_id', tenantId)
    .gte('sale_date', start)
    .lte('sale_date', end)
  return new Set((data ?? []).map((r) => String(r.sale_date)))
}

async function salesTotalInRange(
  supabase: DB,
  tenantId: string,
  start: string,
  end: string
): Promise<number> {
  const { data } = await supabase
    .from('daily_sales')
    .select('total_amount')
    .eq('tenant_id', tenantId)
    .gte('sale_date', start)
    .lte('sale_date', end)
  return (data ?? []).reduce((sum, r) => sum + Number(r.total_amount ?? 0), 0)
}

// Menu items sold across a window, summed per recipe — drives theoretical usage.
async function soldItemsInRange(
  supabase: DB,
  tenantId: string,
  start: string,
  end: string
): Promise<Map<string, number>> {
  const acc = new Map<string, number>()
  const { data: sales } = await supabase
    .from('daily_sales')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('sale_date', start)
    .lte('sale_date', end)
  const ids = (sales ?? []).map((r) => r.id)
  if (ids.length === 0) return acc

  const { data: items } = await supabase
    .from('daily_sales_items')
    .select('recipe_id, quantity')
    .in('daily_sales_id', ids)
  for (const it of items ?? []) {
    acc.set(it.recipe_id, (acc.get(it.recipe_id) ?? 0) + Number(it.quantity))
  }
  return acc
}

// Sum the per-day theoretical-usage snapshots (frozen at each confirm) over a
// window. `complete` is false when any itemized-sales day in the window lacks a
// snapshot (pre-feature days), telling the caller to fall back to a live recompute.
async function theoreticalUsageSnapshot(
  supabase: DB,
  tenantId: string,
  start: string,
  end: string
): Promise<{ map: Map<string, number>; complete: boolean }> {
  const map = new Map<string, number>()
  const { data: days } = await supabase
    .from('daily_sales')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('sale_date', start)
    .lte('sale_date', end)
  const ids = (days ?? []).map((d) => d.id)
  if (ids.length === 0) return { map, complete: true }

  const [{ data: snap }, { data: items }] = await Promise.all([
    supabase
      .from('daily_sales_theoretical_usage')
      .select('daily_sales_id, ingredient_id, quantity')
      .in('daily_sales_id', ids),
    supabase
      .from('daily_sales_items')
      .select('daily_sales_id')
      .in('daily_sales_id', ids),
  ])
  const covered = new Set((snap ?? []).map((r) => r.daily_sales_id))
  for (const r of snap ?? []) {
    map.set(r.ingredient_id, (map.get(r.ingredient_id) ?? 0) + Number(r.quantity))
  }
  const itemizedDays = new Set((items ?? []).map((i) => i.daily_sales_id))
  const complete = [...itemizedDays].every((id) => covered.has(id))
  return { map, complete }
}

// What the next count will cover + which sales days are missing. Drives the
// pre-count checklist.
export async function getPreCountInfo(tenantId: string): Promise<PreCountInfo> {
  const supabase = createClient()
  const tenant = await getTenant(tenantId)
  const cycleDays = tenant?.count_cycle_days ?? 7

  const prev = await getLastCountPeriod(supabase, tenantId)
  const hasPreviousCount = !!prev
  const periodStart = prev?.period_end ?? (await getOpeningDate(supabase, tenantId))
  const periodEnd = todayStr()
  const daysInPeriod = daysBetween(periodStart, periodEnd)

  const win = salesWindow(periodStart, periodEnd, hasPreviousCount)
  let missingSalesDates: string[] = []
  let todayHasSales = true
  if (win) {
    const have = await salesDatesInRange(supabase, tenantId, win.start, win.end)
    missingSalesDates = enumerateDates(win.start, win.end).filter((d) => !have.has(d))
    todayHasSales = have.has(periodEnd)
  }

  return {
    periodStart,
    periodEnd,
    daysInPeriod,
    cycleDays,
    hasPreviousCount,
    salesWindowStart: win?.start ?? null,
    salesWindowEnd: win?.end ?? null,
    missingSalesDates,
    todayHasSales,
  }
}

// Days since the last confirmed count, for the dashboard reminder. Falls back
// to the latest legacy 'count' movement when no period rows exist yet.
export async function getLastCountInfo(tenantId: string): Promise<LastCountInfo> {
  const supabase = createClient()
  const tenant = await getTenant(tenantId)
  const cycleDays = tenant?.count_cycle_days ?? 7

  const prev = await getLastCountPeriod(supabase, tenantId)
  let lastCountDate = prev?.period_end ?? null

  if (!lastCountDate) {
    const { data } = await supabase
      .from('stock_movements')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .eq('movement_type', 'count')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.created_at) lastCountDate = String(data.created_at).slice(0, 10)
  }

  const daysSince = lastCountDate ? daysBetween(lastCountDate, todayStr()) : null
  return { lastCountDate, daysSince, cycleDays }
}

// Has the business established opening inventory yet — i.e. done its initial
// (zero) stock count? Sales can't be recorded before this: you can't sell stock
// that was never counted in. True if any count period OR any 'count' movement
// exists (the latter covers tenants from before count_periods).
//
// This is the same "a count exists" signal the dashboard onboarding gate derives
// from getLastCountInfo().lastCountDate !== null. Keep the two period-OR-movement
// derivations in sync if either fallback changes.
export async function hasInitialCount(tenantId: string): Promise<boolean> {
  const supabase = createClient()
  const { count: periods } = await supabase
    .from('count_periods')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  if ((periods ?? 0) > 0) return true

  const { count: counts } = await supabase
    .from('stock_movements')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('movement_type', 'count')
  return (counts ?? 0) > 0
}

// ── Period rows ──────────────────────────────────────────────────────────
export async function listPeriods(tenantId: string): Promise<CountPeriod[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('count_periods')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('period_end', { ascending: false })
  return (data as CountPeriod[] | null) ?? []
}

export async function getPeriod(
  tenantId: string,
  id: string
): Promise<CountPeriod | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('count_periods')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .maybeSingle()
  return (data as CountPeriod | null) ?? null
}

export interface CountRow {
  id: string
  period_start: string
  period_end: string
  days_in_period: number
  counted_at: string
  sales_total: number | null
  food_cost_percent: number | null
  waste_value: number | null
  // Σ line variance value (actual − theoretical usage); null when sales weren't
  // itemized for the period.
  variance_value: number | null
  has_missing_sales: boolean
}

// Recent stock-count results as flat rows for the owner data explorer. Pulls the
// headline figures from each period's stored report_data (null until generated).
export async function getCountRows(tenantId: string): Promise<CountRow[]> {
  const periods = await listPeriods(tenantId)
  const r2 = (n: number): number => Math.round(n * 100) / 100
  return periods.map((p) => {
    const report = (p.report_data as unknown as PeriodReportData | null) ?? null
    const variance =
      report && report.has_itemized_sales
        ? r2(report.lines.reduce((s, l) => s + l.variance_value, 0))
        : null
    return {
      id: p.id,
      period_start: p.period_start,
      period_end: p.period_end,
      days_in_period: p.days_in_period,
      counted_at: p.counted_at,
      sales_total: report?.sales_total ?? null,
      food_cost_percent: report?.food_cost_percent ?? null,
      waste_value: report?.waste_value ?? null,
      variance_value: variance,
      has_missing_sales: p.has_missing_sales ?? false,
    }
  })
}

// ── Report generation ────────────────────────────────────────────────────
// (Re)compute the stored report for a period from all current data. Recomputes
// missing-sales (late entries change it). `bumpVersion` increments the version
// counter — true for explicit regeneration, false for the initial build.
export async function generatePeriodReport(
  tenantId: string,
  periodId: string,
  opts: { bumpVersion?: boolean } = {}
): Promise<PeriodReportData | null> {
  const supabase = createClient()
  const period = await getPeriod(tenantId, periodId)
  if (!period) return null

  const { data: prevRow } = await supabase
    .from('count_periods')
    .select('counted_at')
    .eq('tenant_id', tenantId)
    .lt('counted_at', period.counted_at)
    .order('counted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const closingAsOf = period.counted_at
  // The very first (baseline) count has no prior period — it only establishes
  // opening inventory, so opening = closing ⇒ zero usage. Without this the
  // counted stock looks like a full period of consumption (COGS), as if it had
  // all been sold/used. Later counts open from the previous count's timestamp.
  const openingAsOf =
    (prevRow?.counted_at as string | undefined) ?? closingAsOf

  const [movements, ingredients] = await Promise.all([
    getStockMovements(tenantId),
    getIngredients(tenantId),
  ])

  const openingLevels = deriveStockLevelsAsOf(movements, openingAsOf)
  const closingLevels = deriveStockLevelsAsOf(movements, closingAsOf)
  const openMs = Date.parse(openingAsOf)
  const closeMs = Date.parse(closingAsOf)
  const periodMovements = movements.filter((m) => {
    const t = new Date(m.created_at).getTime()
    return t > openMs && t <= closeMs
  })

  const win = salesWindow(period.period_start, period.period_end, !!prevRow)
  let missingSalesDates: string[] = []
  let salesTotal = 0
  let theoreticalUsage = new Map<string, number>()
  let hasItemizedSales = false
  if (win) {
    const have = await salesDatesInRange(supabase, tenantId, win.start, win.end)
    missingSalesDates = enumerateDates(win.start, win.end).filter((d) => !have.has(d))
    salesTotal = await salesTotalInRange(supabase, tenantId, win.start, win.end)

    // Explode the period's sold menu items into expected ingredient usage.
    const soldMap = await soldItemsInRange(supabase, tenantId, win.start, win.end)
    if (soldMap.size > 0) {
      hasItemizedSales = true
      // Prefer the frozen per-day snapshot (immutable history, #4). Fall back to a
      // live recipe explosion only for windows that still have pre-feature days
      // without a snapshot, so nothing regresses during the transition.
      const snap = await theoreticalUsageSnapshot(
        supabase,
        tenantId,
        win.start,
        win.end
      )
      if (snap.complete) {
        theoreticalUsage = snap.map
      } else {
        const [recipes, recipeIngredients] = await Promise.all([
          getRecipes(tenantId),
          getRecipeIngredients(tenantId),
        ])
        const soldItems = [...soldMap.entries()].map(([recipe_id, quantity]) => ({
          recipe_id,
          quantity,
        }))
        theoreticalUsage = computeTheoreticalUsage(
          soldItems,
          ingredients,
          recipes,
          recipeIngredients
        ).usageByIngredient
      }
    }
  }

  const report = computePeriodReport({
    periodStart: period.period_start,
    periodEnd: period.period_end,
    daysInPeriod: period.days_in_period,
    ingredients,
    openingLevels,
    closingLevels,
    periodMovements,
    salesTotal,
    missingSalesDates,
    theoreticalUsage,
    hasItemizedSales,
  })

  await supabase
    .from('count_periods')
    .update({
      report_data: report as unknown as Json,
      report_generated_at: new Date().toISOString(),
      missing_sales_dates: missingSalesDates,
      has_missing_sales: missingSalesDates.length > 0,
      regeneration_count: period.regeneration_count + (opts.bumpVersion ? 1 : 0),
    })
    .eq('tenant_id', tenantId)
    .eq('id', periodId)

  return report
}

// Create the count period for a just-confirmed count, then build its report.
// Returns the new period id (or null on failure).
export async function createPeriodForCount(
  tenantId: string,
  userId: string,
  countDate?: string
): Promise<string | null> {
  const supabase = createClient()
  const prev = await getLastCountPeriod(supabase, tenantId)
  const periodStart = prev?.period_end ?? (await getOpeningDate(supabase, tenantId))
  // Honor the user's business date when valid (strictly after the prior period
  // and not in the future); else fall back to today. counted_at drives the
  // report's closing snapshot, so it must match the count movement's end-of-day
  // stamp (set in submitStockCount).
  const today = todayStr()
  const useDate =
    countDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(countDate) &&
    countDate > periodStart &&
    countDate <= today
      ? countDate
      : today
  const periodEnd = useDate
  // Baseline (first-ever) count = OPENING stock → stamp at now, matching the
  // count movements, so same-day activity recorded afterwards stays additive.
  // Subsequent counts = end-of-day closing truth.
  const countedAt = prev ? `${useDate}T23:59:59Z` : new Date().toISOString()
  const daysInPeriod = daysBetween(periodStart, periodEnd)

  const { data, error } = await supabase
    .from('count_periods')
    .insert({
      tenant_id: tenantId,
      period_start: periodStart,
      period_end: periodEnd,
      days_in_period: daysInPeriod,
      counted_at: countedAt,
      recorded_by: userId,
    })
    .select('id')
    .single()

  if (error || !data) return null

  await generatePeriodReport(tenantId, data.id, { bumpVersion: false })
  return data.id
}
