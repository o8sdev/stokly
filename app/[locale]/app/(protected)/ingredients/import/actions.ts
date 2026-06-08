'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenant, canWrite } from '@/lib/auth/tenant'
import { ALLOWED_UNITS, type ImportRow } from '@/lib/import/parse-ingredients'
import type { Database } from '@/types/database'

type IngredientInsert =
  Database['public']['Tables']['ingredients']['Insert']

export interface ImportResult {
  ok?: boolean
  inserted?: number
  skipped?: number
  error?: string
}

const UNIT_SET = new Set<string>(ALLOWED_UNITS)

// Batch-insert validated import rows. Auto-creates suppliers by name
// (case-insensitive) and links them. Skips any row that fails a final
// server-side sanity check; never throws on partial bad data.
export async function importIngredients(
  locale: string,
  rowsJson: string
): Promise<ImportResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  let rows: ImportRow[]
  try {
    rows = JSON.parse(rowsJson) as ImportRow[]
  } catch {
    return { error: 'parse' }
  }

  // Final guard: name + valid unit required.
  const clean = rows.filter(
    (r) => r.name?.trim() && r.unit && UNIT_SET.has(r.unit)
  )
  const skipped = rows.length - clean.length
  if (clean.length === 0) return { ok: true, inserted: 0, skipped }

  const supabase = createClient()

  // Resolve / create suppliers (case-insensitive) for the whole batch.
  const wanted = new Map<string, string>() // lower → original
  for (const r of clean) {
    const s = r.supplier_name?.trim()
    if (s) wanted.set(s.toLowerCase(), s)
  }

  const supplierIdByLower = new Map<string, string>()
  if (wanted.size > 0) {
    const { data: existing } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('tenant_id', ctx.tenantId)
    for (const s of existing ?? []) {
      supplierIdByLower.set(s.name.toLowerCase(), s.id)
    }
    const toCreate = [...wanted.entries()].filter(
      ([lower]) => !supplierIdByLower.has(lower)
    )
    if (toCreate.length > 0) {
      const { data: created } = await supabase
        .from('suppliers')
        .insert(
          toCreate.map(([, name]) => ({ tenant_id: ctx.tenantId, name }))
        )
        .select('id, name')
      for (const s of created ?? []) {
        supplierIdByLower.set(s.name.toLowerCase(), s.id)
      }
    }
  }

  const inserts: IngredientInsert[] = clean.map((r) => ({
    tenant_id: ctx.tenantId,
    name: r.name.trim(),
    name_ru: r.name_ru?.trim() || null,
    unit: r.unit,
    cost_per_unit: r.cost_per_unit ?? 0,
    yield_percent: r.yield_percent ?? 1,
    supplier_id: r.supplier_name
      ? supplierIdByLower.get(r.supplier_name.trim().toLowerCase()) ?? null
      : null,
    low_stock_threshold: r.low_stock_threshold ?? null,
  }))

  const { error } = await supabase.from('ingredients').insert(inserts)
  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/app/ingredients`)
  return { ok: true, inserted: inserts.length, skipped }
}

// Copy selected global-library rows into the tenant's ingredients (cost = 0,
// so the manager fills prices afterwards).
export async function addFromLibrary(
  locale: string,
  idsJson: string
): Promise<ImportResult> {
  const ctx = await requireTenant(locale)
  if (!canWrite(ctx.role)) return { error: 'forbidden' }

  let ids: string[]
  try {
    ids = JSON.parse(idsJson) as string[]
  } catch {
    return { error: 'parse' }
  }
  if (ids.length === 0) return { ok: true, inserted: 0 }

  const supabase = createClient()
  const { data: lib } = await supabase
    .from('global_ingredient_library')
    .select('*')
    .in('id', ids)

  const inserts: IngredientInsert[] = (lib ?? []).map((g) => ({
    tenant_id: ctx.tenantId,
    name: g.name_az,
    name_ru: g.name_ru,
    unit: g.default_unit,
    cost_per_unit: 0,
    yield_percent: g.default_yield_percent ?? 1,
  }))

  if (inserts.length === 0) return { ok: true, inserted: 0 }

  const { error } = await supabase.from('ingredients').insert(inserts)
  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/app/ingredients`)
  return { ok: true, inserted: inserts.length }
}
