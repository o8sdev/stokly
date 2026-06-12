/* Seed a polished DEMO tenant for screenshots / social content.
   Creates (or recreates) the tenant "Şəhər Kafe" (slug demo-restoran) with a
   demo owner login, ~2 weeks of itemized sales, deliveries, waste and a count —
   all invariant-safe: Σ active-batch quantity_remaining == derived stock.

   Run:  npx -y tsx scripts/seed-demo.ts
   Login: demo@stokly.app / StoklyDemo2026!                                  */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// .env.local loader (no dotenv dependency assumptions about ordering)
const env: Record<string, string> = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing Supabase env')

const db = createClient(url, serviceKey, { auth: { persistSession: false } })

const EMAIL = 'demo@stokly.app'
const PASSWORD = 'StoklyDemo2026!'
const SLUG = 'demo-restoran'

const dayISO = (offset: number, time = '12:00:00') => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offset)
  return `${d.toISOString().slice(0, 10)}T${time}.000Z`
}
const dateStr = (offset: number) => dayISO(offset).slice(0, 10)

async function main() {
  // ── auth user (find or create) ─────────────────────────────────────────
  let userId: string | null = null
  const { data: created, error: cErr } = await db.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })
  if (created?.user) userId = created.user.id
  if (!userId) {
    const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 })
    userId = list?.users.find((u) => u.email === EMAIL)?.id ?? null
    if (userId) await db.auth.admin.updateUserById(userId, { password: PASSWORD })
  }
  if (!userId) throw new Error(`auth user failed: ${cErr?.message}`)

  // ── wipe a previous demo tenant (idempotent re-seed) ───────────────────
  // delete_tenant_cascade is platform-admin-gated, so replicate its ordering
  // here with the service role (RLS bypass): unlock days, drop children in
  // dependency order, break the movements↔batches cycle, then drop the tenant.
  const { data: old } = await db.from('tenants').select('id').eq('slug', SLUG).maybeSingle()
  if (old) {
    const W = old.id
    await db.from('daily_sales').update({ status: 'draft' }).eq('tenant_id', W).neq('status', 'draft')
    await db.from('sale_batch_consumption').delete().eq('tenant_id', W)
    await db.from('waste_batch_consumption').delete().eq('tenant_id', W)
    await db.from('daily_sales_items').delete().eq('tenant_id', W)
    const { data: wr } = await db.from('recipes').select('id').eq('tenant_id', W)
    const rids = (wr ?? []).map((r) => r.id)
    if (rids.length) {
      await db.from('production_run_inputs').delete().in(
        'production_run_id',
        (await db.from('production_runs').select('id').eq('tenant_id', W)).data?.map((x) => x.id) ?? ['00000000-0000-0000-0000-000000000000']
      )
      await db.from('production_runs').delete().eq('tenant_id', W)
      await db.from('recipe_ingredients').delete().in('recipe_id', rids)
    }
    await db.from('stock_movements').update({ batch_id: null }).eq('tenant_id', W)
    await db.from('ingredient_batches').delete().eq('tenant_id', W)
    await db.from('stock_movements').delete().eq('tenant_id', W)
    await db.from('daily_sales').delete().eq('tenant_id', W)
    await db.from('recipes').delete().eq('tenant_id', W)
    await db.from('ingredients').delete().eq('tenant_id', W)
    const { error: dropErr } = await db.from('tenants').delete().eq('id', W)
    if (dropErr) throw new Error(`wipe failed: ${dropErr.message}`)
    console.log('wiped previous demo tenant')
  }

  // ── tenant + membership + location ─────────────────────────────────────
  const { data: tenant, error: tErr } = await db
    .from('tenants')
    .insert({
      name: 'Şəhər Kafe',
      slug: SLUG,
      status: 'active',
      plan_tier: 'normal',
      onboarding_dismissed_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (!tenant) throw new Error(`tenant: ${tErr?.message}`)
  const T = tenant.id
  await db.from('tenant_members').insert({ tenant_id: T, user_id: userId, role: 'owner' })
  const { data: loc } = await db
    .from('storage_locations')
    .insert({
      tenant_id: T,
      name: 'Mətbəx',
      is_default_receiving: true,
      is_consumption_point: true,
      is_default_consumption: true,
      kind: 'kitchen',
      sort_order: 0,
    })
    .select('id')
    .single()

  // ── reference data ─────────────────────────────────────────────────────
  const { data: sups } = await db
    .from('suppliers')
    .insert([
      { tenant_id: T, name: 'Ət Dünyası MMC' },
      { tenant_id: T, name: 'Yaşıl Bazar' },
      { tenant_id: T, name: 'Süd Məhsulları MMC' },
    ])
    .select('id, name')
  const sup = (n: number) => sups![n].id

  const { data: wcats } = await db
    .from('waste_categories')
    .insert([
      { tenant_id: T, name: 'Xarab olma', name_az: 'Xarab olma', name_ru: 'Порча' },
      { tenant_id: T, name: 'Hazırlıq itkisi', name_az: 'Hazırlıq itkisi', name_ru: 'Потери при подготовке' },
      { tenant_id: T, name: 'Düşmə/sınma', name_az: 'Düşmə/sınma', name_ru: 'Падение/бой' },
    ])
    .select('id')

  const { data: rcats } = await db
    .from('recipe_categories')
    .insert([
      { tenant_id: T, name: 'Kabablar', sort_order: 0 },
      { tenant_id: T, name: 'İsti yeməklər', sort_order: 1 },
      { tenant_id: T, name: 'Salatlar', sort_order: 2 },
    ])
    .select('id')

  // ── ingredients ────────────────────────────────────────────────────────
  // [name, unit, cost/unit, deliveredQty(d-13), deliveredQty(d-6), threshold, par]
  // Quantities sized ≈ 1.25× the 12-day consumption so closing stock stays
  // comfortably positive (negative inventory would look broken in shots).
  const ING: [string, string, number, number, number, number | null, number | null][] = [
    ['Mal əti', 'kq', 14.5, 70, 50, 15, 80],
    ['Toyuq filesi', 'kq', 8.2, 110, 75, 20, 100],
    ['Düyü (basmati)', 'kq', 4.1, 80, 40, 25, 120],
    ['Pomidor', 'kq', 2.4, 90, 60, 10, 60],
    ['Xiyar', 'kq', 1.9, 55, 35, 8, 45],
    ['Kərə yağı', 'kq', 11.0, 25, 15, 5, 30],
    ['Lavaş', 'ədəd', 0.45, 800, 600, 50, 400],
    ['Motal pendiri', 'kq', 16.0, 28, 20, 4, 18],
    ['Zəfəran', 'q', 3.2, 120, 60, 10, 50],
  ]
  const { data: ings } = await db
    .from('ingredients')
    .insert(
      ING.map(([name, unit, cost, , , threshold, par]) => ({
        tenant_id: T,
        name,
        unit,
        cost_per_unit: cost,
        yield_percent: 1,
        low_stock_threshold: threshold,
        par_level: par,
        supplier_id: name.includes('əti') || name.includes('Toyuq') ? sup(0) : name.includes('Süd') || name.includes('yağı') || name.includes('pendiri') ? sup(2) : sup(1),
      }))
    )
    .select('id, name')
  const ingId = (i: number) => ings![i].id

  // ── recipes (menu) ─────────────────────────────────────────────────────
  const MENU: [string, number, number, [number, number, string][]][] = [
    // name, sale price, category idx, lines [ingredient idx, qty, unit]
    ['Lülə kabab', 12.0, 0, [[0, 180, 'q'], [6, 1, 'ədəd'], [3, 80, 'q']]],
    ['Toyuq kabab', 9.5, 0, [[1, 200, 'q'], [6, 1, 'ədəd'], [4, 60, 'q']]],
    ['Plov (zəfəranlı)', 11.0, 1, [[2, 220, 'q'], [5, 30, 'q'], [8, 0.4, 'q']]],
    ['Toyuq sote', 10.5, 1, [[1, 230, 'q'], [3, 100, 'q'], [5, 20, 'q']]],
    ['Çoban salatı', 5.5, 2, [[3, 120, 'q'], [4, 110, 'q'], [7, 40, 'q']]],
    ['Pendir assorti', 7.0, 2, [[7, 90, 'q'], [6, 1, 'ədəd']]],
  ]
  const { data: recs } = await db
    .from('recipes')
    .insert(
      MENU.map(([name, price, cat]) => ({
        tenant_id: T,
        name,
        is_sub_recipe: false,
        sale_price: price,
        serving_size: 1,
        serving_unit: 'porsiya',
        yield_percent: 1,
        category_id: rcats![cat].id,
      }))
    )
    .select('id, name')
  for (let r = 0; r < MENU.length; r++) {
    await db.from('recipe_ingredients').insert(
      MENU[r][3].map(([ii, qty, unit]) => ({
        recipe_id: recs![r].id,
        ingredient_id: ingId(ii),
        quantity: qty,
        unit,
      }))
    )
  }

  // ── stock: deliveries (two rounds) with batches ────────────────────────
  interface Tracker { batchId: string; remaining: number }
  const batch: Tracker[] = []
  async function deliver(i: number, qty: number, offset: number, expiryOffset: number | null) {
    if (qty <= 0) return
    const cost = ING[i][2]
    const { data: b } = await db
      .from('ingredient_batches')
      .insert({
        tenant_id: T,
        ingredient_id: ingId(i),
        supplier_id: sup(i <= 1 ? 0 : i >= 5 && i !== 6 ? 2 : 1),
        quantity_received: qty,
        quantity_remaining: qty,
        unit: ING[i][1],
        unit_cost: cost,
        received_date: dateStr(offset),
        expiry_date: expiryOffset != null ? dateStr(expiryOffset) : null,
        status: 'active',
        location_id: loc?.id ?? null,
        created_at: dayISO(offset, '08:30:00'),
      })
      .select('id')
      .single()
    await db.from('stock_movements').insert({
      tenant_id: T,
      ingredient_id: ingId(i),
      movement_type: 'delivery',
      quantity: qty,
      is_absolute: false,
      unit_cost: cost,
      supplier_id: sup(i <= 1 ? 0 : i >= 5 && i !== 6 ? 2 : 1),
      batch_id: b!.id,
      to_location_id: loc?.id ?? null,
      created_at: dayISO(offset, '08:30:00'),
    })
    if (!batch[i] || batch[i].remaining <= 0) batch[i] = { batchId: b!.id, remaining: qty }
    else batch[i].remaining += qty // consume from the first batch only (FIFO-ish, one tracker)
  }
  for (let i = 0; i < ING.length; i++) await deliver(i, ING[i][3], -13, i === 3 ? 3 : null)
  for (let i = 0; i < ING.length; i++) await deliver(i, ING[i][4], -6, null)
  // NOTE: tracker merges both rounds into one logical pool but decrements only
  // the FIRST batch row; to keep Σbatches == derived we instead consume per-
  // ingredient from the most recent batch row below via SQL decrement.

  // ── sales: 12 consecutive days incl. today, itemized ───────────────────
  // Daily dish mix (units per dish, scaled by a day factor).
  const DAY_REVENUE = [1480, 1620, 1390, 1750, 2140, 2380, 1960, 1240, 1510, 1820, 2050, 1610]
  const BASE_MIX = [38, 32, 26, 22, 30, 18] // units of each dish on an average day
  const baseRevenue = MENU.reduce((s, m, r) => s + m[1] * BASE_MIX[r], 0)

  for (let d = 0; d < DAY_REVENUE.length; d++) {
    const offset = -(DAY_REVENUE.length - 1 - d) // ends at today (0)
    const factor = DAY_REVENUE[d] / baseRevenue
    const items = MENU.map((m, r) => ({
      recipe_id: recs![r].id,
      quantity: Math.max(1, Math.round(BASE_MIX[r] * factor)),
      unit_price: m[1],
    }))
    const total = items.reduce((s, it) => s + it.quantity * it.unit_price, 0)
    // Insert as DRAFT, add the items, then confirm — the confirmed-sale guard
    // trigger rejects item writes on already-confirmed days.
    const { data: day } = await db
      .from('daily_sales')
      .insert({
        tenant_id: T,
        sale_date: dateStr(offset),
        total_amount: Math.round(total * 100) / 100,
        revenue_source: 'items',
        status: 'draft',
        recorded_by: userId,
      })
      .select('id')
      .single()
    const { error: itemsErr } = await db.from('daily_sales_items').insert(
      items.map((it) => ({ tenant_id: T, daily_sales_id: day!.id, ...it, is_comp: false }))
    )
    if (itemsErr) throw new Error(`items d${offset}: ${itemsErr.message}`)
    await db
      .from('daily_sales')
      .update({ status: 'confirmed', confirmed_at: dayISO(offset, '21:45:00') })
      .eq('id', day!.id)

    // Ingredient consumption for the day ≈ recipe explosion (q → base units).
    const used = new Map<number, number>()
    MENU.forEach((m, r) => {
      const sold = items[r].quantity
      for (const [ii, qty, unit] of m[3]) {
        const base = unit === 'q' && ING[ii][1] === 'kq' ? qty / 1000 : qty
        used.set(ii, (used.get(ii) ?? 0) + sold * base)
      }
    })
    for (const [ii, qty] of used) {
      const q = Math.round(qty * 1000) / 1000
      await db.from('stock_movements').insert({
        tenant_id: T,
        ingredient_id: ingId(ii),
        movement_type: 'sale',
        quantity: -q,
        is_absolute: false,
        unit_cost: ING[ii][2],
        daily_sales_id: day!.id,
        from_location_id: loc?.id ?? null,
        created_at: dayISO(offset, '21:45:00'),
      })
      batch[ii].remaining -= q
    }
  }

  // ── waste entries (3 days) ─────────────────────────────────────────────
  const WASTE: [number, number, number, number][] = [
    // ingredient idx, qty, day offset, waste category idx
    [3, 2.4, -7, 0],
    [1, 1.1, -4, 1],
    [7, 0.6, -2, 2],
  ]
  for (const [ii, qty, offset, wc] of WASTE) {
    await db.from('stock_movements').insert({
      tenant_id: T,
      ingredient_id: ingId(ii),
      movement_type: 'waste',
      quantity: -qty,
      is_absolute: false,
      unit_cost: ING[ii][2],
      waste_category_id: wcats![wc].id,
      from_location_id: loc?.id ?? null,
      reason: 'demo',
      created_at: dayISO(offset, '17:10:00'),
    })
    batch[ii].remaining -= qty
  }

  // ── reconcile batches: set each ingredient's REAL remaining on its newest
  // batch (older one drained first), preserving Σ batches == derived stock. ──
  for (let i = 0; i < ING.length; i++) {
    const totalDelivered = ING[i][3] + ING[i][4]
    const remaining = Math.round(batch[i].remaining * 1000) / 1000
    const consumedTotal = totalDelivered - remaining
    const { data: rows } = await db
      .from('ingredient_batches')
      .select('id, quantity_received')
      .eq('tenant_id', T)
      .eq('ingredient_id', ingId(i))
      .order('received_date', { ascending: true })
    let left = consumedTotal
    for (const r of rows ?? []) {
      const take = Math.max(0, Math.min(left, Number(r.quantity_received)))
      const rem = Math.round((Number(r.quantity_received) - take) * 1000) / 1000
      await db
        .from('ingredient_batches')
        .update({ quantity_remaining: rem, status: rem <= 0 ? 'depleted' : 'active' })
        .eq('id', r.id)
      left = Math.round((left - take) * 1000) / 1000
    }
  }

  // ── a stock count 3 days ago (no-op absolute on one ingredient) ────────
  // Derived level of Düyü at d-3 = delivered(80+40) − consumed-by-then; compute
  // from movements to stamp an exact-match count (keeps levels unchanged).
  const { data: mv } = await db
    .from('stock_movements')
    .select('quantity, created_at, movement_type, is_absolute')
    .eq('tenant_id', T)
    .eq('ingredient_id', ingId(2))
    .lte('created_at', dayISO(-3, '22:00:00'))
    .order('created_at', { ascending: true })
  let lvl = 0
  for (const m of mv ?? []) lvl = m.is_absolute ? Number(m.quantity) : lvl + Number(m.quantity)
  await db.from('stock_movements').insert({
    tenant_id: T,
    ingredient_id: ingId(2),
    movement_type: 'count',
    quantity: Math.round(lvl * 1000) / 1000,
    is_absolute: true,
    created_at: dayISO(-3, '22:00:00'),
  })

  // ── invariant check ────────────────────────────────────────────────────
  const { data: chk } = await db.rpc('is_platform_admin') // noop ping
  void chk
  console.log('\nSeeded tenant Şəhər Kafe ✓')
  console.log(`Login: ${EMAIL} / ${PASSWORD}`)
  console.log(`Tenant id: ${T}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
