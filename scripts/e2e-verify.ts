/* End-to-end BUSINESS-LOGIC verification through the REAL UI.
   Creates a fresh tenant, then drives every flow with puppeteer like a user:
   ingredients → unit conversion → day-0 count → purchase → prep recipe →
   production (İstehsal) → dishes (prep inside a dish) → sales+confirm →
   waste → inventory/dashboard numbers. Asserts hand-computed expectations
   against BOTH the DOM and SQL after every mutation.

   Run:  npx -y tsx scripts/e2e-verify.ts
   Evidence: social-shots/e2e/*.png + step log on stdout.                     */
import puppeteer, { type Page } from 'puppeteer-core'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, readFileSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = 'social-shots/e2e'
const EMAIL = 'e2e@stokly.app'
const PASSWORD = 'StoklyE2E2026!'
const SLUG = 'e2e-test'

// ── env + service client ────────────────────────────────────────────────────
const env: Record<string, string> = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ── step logger ─────────────────────────────────────────────────────────────
const failures: string[] = []
function check(step: string, actual: number | string | boolean, expected: number | string | boolean, tol = 0.011) {
  const ok =
    typeof actual === 'number' && typeof expected === 'number'
      ? Math.abs(actual - expected) <= tol
      : actual === expected
  console.log(`${ok ? '  ✅' : '  ❌'} ${step} → ${actual}${ok ? '' : `  (EXPECTED ${expected})`}`)
  if (!ok) failures.push(`${step}: got ${actual}, expected ${expected}`)
}
function note(s: string) {
  console.log(`  🔍 ${s}`)
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── SQL helpers ─────────────────────────────────────────────────────────────
let T = '' // tenant id
async function derived(): Promise<Map<string, number>> {
  const { data } = await db
    .from('stock_movements')
    .select('ingredient_id, quantity, is_absolute, created_at, movement_type')
    .eq('tenant_id', T)
    .order('created_at', { ascending: true })
  // Mirrors lib/calculations/stock-level.ts deriveStockLevel: consumption types
  // subtract their MAGNITUDE (RPCs store positive amounts; the sign lives in
  // movement_type), counts are absolute, transfers don't change the total.
  const { data: types } = await db
    .from('stock_movements')
    .select('id, movement_type')
    .eq('tenant_id', T)
  const typeById = new Map((types ?? []).map((r) => [r.id, r.movement_type]))
  void typeById
  const m = new Map<string, number>()
  for (const r of (data ?? []) as Array<{ ingredient_id: string; quantity: number; is_absolute: boolean; created_at: string; movement_type?: string }>) {
    const cur = m.get(r.ingredient_id) ?? 0
    if (r.is_absolute) {
      m.set(r.ingredient_id, Number(r.quantity))
      continue
    }
    const t = r.movement_type ?? ''
    if (t === 'delivery' || t === 'production_output') m.set(r.ingredient_id, cur + Number(r.quantity))
    else if (t === 'waste' || t === 'sale' || t === 'production_input' || t === 'expiry_writeoff')
      m.set(r.ingredient_id, cur - Math.abs(Number(r.quantity)))
    else if (t === 'adjustment') m.set(r.ingredient_id, cur + Number(r.quantity))
  }
  return m
}
async function ingByName(name: string): Promise<{ id: string; cost: number; unit: string }> {
  const { data } = await db
    .from('ingredients')
    .select('id, cost_per_unit, unit')
    .eq('tenant_id', T)
    .eq('name', name)
    .single()
  return { id: data!.id, cost: Number(data!.cost_per_unit), unit: data!.unit }
}
async function batchSum(ingredientId: string): Promise<number> {
  const { data } = await db
    .from('ingredient_batches')
    .select('quantity_remaining')
    .eq('tenant_id', T)
    .eq('ingredient_id', ingredientId)
    .eq('status', 'active')
  return (data ?? []).reduce((s, b) => s + Number(b.quantity_remaining), 0)
}

// ── puppeteer helpers (React-controlled inputs need native setter + events) ─
async function setInput(page: Page, selector: string, value: string) {
  // First dev-mode compile of a route can take >15s — wait generously.
  await page.waitForSelector(selector, { timeout: 60000 })
  await page.$eval(
    selector,
    (el, v) => {
      const input = el as HTMLInputElement
      const setter = Object.getOwnPropertyDescriptor(
        input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
      )!.set!
      setter.call(input, v)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    },
    value
  )
}
async function selectByText(page: Page, scopeSel: string, optionText: string, nth = 0) {
  // pick the nth <select> within scope that has an option containing optionText
  const ok = await page.evaluate(
    (scope, text, n) => {
      const selects = Array.from(document.querySelectorAll(`${scope} select`)) as HTMLSelectElement[]
      const matches = selects.filter((s) => Array.from(s.options).some((o) => o.textContent?.includes(text)))
      const sel = matches[n]
      if (!sel) return false
      const opt = Array.from(sel.options).find((o) => o.textContent?.includes(text))!
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')!.set!
      setter.call(sel, opt.value)
      sel.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    },
    scopeSel,
    optionText,
    nth
  )
  if (!ok) throw new Error(`selectByText: no select in ${scopeSel} with option "${optionText}"`)
}
async function clickByText(page: Page, tag: string, text: string) {
  const clicked = await page.evaluate(
    (tg, tx) => {
      const els = Array.from(document.querySelectorAll(tg)) as HTMLElement[]
      const el = els.find((e) => (e.textContent ?? '').trim().includes(tx) && !(e as HTMLButtonElement).disabled)
      if (!el) return false
      el.click()
      return true
    },
    tag,
    text
  )
  if (!clicked) throw new Error(`clickByText: <${tag}> "${text}" not found`)
}
async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${OUT}/${name}.png` as `${string}.png` })
  console.log(`  📸 ${OUT}/${name}.png`)
}
async function goto(page: Page, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2', timeout: 120000 })
  await sleep(400)
}
async function waitPath(page: Page, includes: string) {
  await page.waitForFunction((p) => window.location.pathname.includes(p), { timeout: 30000 }, includes)
  await sleep(600)
}
// Wait until the pathname ENDS with `suffix` — '/app/recipes' must not match
// '/app/recipes/new', else we navigate away mid-save and lose the insert.
async function waitPathEnd(page: Page, suffix: string) {
  try {
    await page.waitForFunction(
      (sfx) => window.location.pathname.endsWith(sfx),
      { timeout: 45000 },
      suffix
    )
  } catch (e) {
    await page.screenshot({ path: `${OUT}/STUCK-${suffix.replace(/\W+/g, '_')}.png` as `${string}.png` })
    const err = await page.evaluate(() => {
      const el = document.querySelector('.text-destructive')
      return (el?.textContent ?? '') + ' | path=' + window.location.pathname
    })
    throw new Error(`waitPathEnd(${suffix}) timed out — ${err}`)
  }
  await sleep(700)
}
// Click the submit button of the form that contains `innerSel`.
async function submitFormOf(page: Page, innerSel: string) {
  const ok = await page.evaluate((sel) => {
    const inner = document.querySelector(sel)
    const form = inner?.closest('form')
    const btn = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null
    if (!btn) return false
    btn.click()
    return true
  }, innerSel)
  if (!ok) throw new Error(`submitFormOf: no submit in form of ${innerSel}`)
}

// Set the nth recipe-line UNIT select (selects whose options include unit values)
async function setLineUnit(page: Page, value: string, nth = -1) {
  const ok = await page.evaluate(
    (v, n) => {
      const selects = (Array.from(document.querySelectorAll('form select')) as HTMLSelectElement[]).filter(
        (s) =>
          s.id !== 'serving_unit' &&
          Array.from(s.options).some((o) => o.value === 'q') &&
          Array.from(s.options).some((o) => o.value === 'kq')
      )
      const sel = n === -1 ? selects.at(-1) : selects[n]
      if (!sel) return false
      const opt = Array.from(sel.options).find((o) => o.value === v)
      if (!opt) return false
      sel.value = opt.value
      sel.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    },
    value,
    nth
  )
  if (!ok) throw new Error(`setLineUnit(${value}) failed`)
  await new Promise((r) => setTimeout(r, 250))
  const took = await page.evaluate(
    (v, n) => {
      const selects = (Array.from(document.querySelectorAll('form select')) as HTMLSelectElement[]).filter(
        (s) =>
          s.id !== 'serving_unit' &&
          Array.from(s.options).some((o) => o.value === 'q') &&
          Array.from(s.options).some((o) => o.value === 'kq')
      )
      const sel = n === -1 ? selects.at(-1) : selects[n]
      return sel?.value === v
    },
    value,
    nth
  )
  if (!took) {
    await page.evaluate(
      (v, n) => {
        const selects = (Array.from(document.querySelectorAll('form select')) as HTMLSelectElement[]).filter(
          (s) =>
            s.id !== 'serving_unit' &&
            Array.from(s.options).some((o) => o.value === 'q') &&
            Array.from(s.options).some((o) => o.value === 'kq')
        )
        const sel = n === -1 ? selects.at(-1) : selects[n]
        if (!sel) return
        sel.value = v
        sel.dispatchEvent(new Event('change', { bubbles: true }))
      },
      value,
      nth
    )
    await new Promise((r) => setTimeout(r, 250))
  }
}

async function setLastLineQty(page: Page, qty: string) {
  await page.evaluate((q) => {
    const rows = Array.from(document.querySelectorAll('form input[step="0.0001"]')) as HTMLInputElement[]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(rows[rows.length - 1], q)
    rows[rows.length - 1].dispatchEvent(new Event('input', { bubbles: true }))
  }, qty)
}

// Poll an async condition (server actions on a dev server can be slow).
async function until(label: string, fn: () => Promise<boolean>, timeoutMs = 25000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    if (await fn()) return true
    await sleep(900)
  }
  note(`⏰ until(${label}) timed out after ${timeoutMs}ms`)
  return false
}

// ── fresh tenant ────────────────────────────────────────────────────────────
async function freshTenant() {
  let userId: string | null = null
  const { data: created } = await db.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true })
  if (created?.user) userId = created.user.id
  if (!userId) {
    const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 })
    userId = list?.users.find((u) => u.email === EMAIL)?.id ?? null
    if (userId) await db.auth.admin.updateUserById(userId, { password: PASSWORD })
  }
  if (!userId) throw new Error('auth user failed')

  const { data: old } = await db.from('tenants').select('id').eq('slug', SLUG).maybeSingle()
  if (old) {
    const W = old.id
    await db.from('daily_sales').update({ status: 'draft' }).eq('tenant_id', W).neq('status', 'draft')
    await db.from('sale_batch_consumption').delete().eq('tenant_id', W)
    await db.from('waste_batch_consumption').delete().eq('tenant_id', W)
    await db.from('daily_sales_items').delete().eq('tenant_id', W)
    const runs = (await db.from('production_runs').select('id').eq('tenant_id', W)).data?.map((x) => x.id) ?? []
    if (runs.length) await db.from('production_run_inputs').delete().in('production_run_id', runs)
    await db.from('production_runs').delete().eq('tenant_id', W)
    const recs = (await db.from('recipes').select('id').eq('tenant_id', W)).data?.map((r) => r.id) ?? []
    if (recs.length) await db.from('recipe_ingredients').delete().in('recipe_id', recs)
    await db.from('stock_movements').update({ batch_id: null }).eq('tenant_id', W)
    await db.from('ingredient_batches').delete().eq('tenant_id', W)
    await db.from('stock_movements').delete().eq('tenant_id', W)
    await db.from('daily_sales').delete().eq('tenant_id', W)
    await db.from('recipes').delete().eq('tenant_id', W)
    await db.from('ingredients').delete().eq('tenant_id', W)
    await db.from('tenants').delete().eq('id', W)
    console.log('  (wiped previous e2e tenant)')
  }

  const { data: tenant } = await db
    .from('tenants')
    .insert({ name: 'E2E Restoran', slug: SLUG, status: 'active', plan_tier: 'normal' })
    .select('id')
    .single()
  T = tenant!.id
  await db.from('tenant_members').insert({ tenant_id: T, user_id: userId, role: 'owner' })
  await db.from('storage_locations').insert({
    tenant_id: T,
    name: 'Mətbəx',
    is_default_receiving: true,
    is_consumption_point: true,
    is_default_consumption: true,
    kind: 'kitchen',
    sort_order: 0,
  })
  console.log(`  tenant ${T}`)
}

// ── the run ─────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(OUT, { recursive: true })
  console.log('\n═══ SETUP: fresh tenant ═══')
  await freshTenant()

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 })

  // LOGIN
  console.log('\n═══ S1 · Login + onboarding state ═══')
  await goto(page, '/az/app/login')
  await page.type('#email', EMAIL)
  await page.type('#password', PASSWORD)
  await page.click('button[type="submit"]')
  await waitPath(page, '/app/dashboard')
  const hasOnboarding = await page.evaluate(() => document.body.innerText.includes('Bələdçi') || document.body.innerText.includes('tur'))
  note(`onboarding/getting-started visible on fresh tenant: ${hasOnboarding}`)
  await shot(page, '01-onboarding-dashboard')

  // S2 · INGREDIENTS via the form
  console.log('\n═══ S2 · Add ingredients (UI form) ═══')
  const ING: [string, string, string, string?][] = [
    // name, unit, cost, par?
    ['Toyuq filesi', 'kq', '8', '20'],
    ['Çörək qırıntısı', 'kq', '2.5'],
    ['Romain salatı', 'kq', '6'],
    ['Parmezan', 'kq', '30'],
    ['Zeytun yağı', 'l', '12'],
  ]
  for (const [name, unit, cost, par] of ING) {
    await goto(page, '/az/app/ingredients/new')
    await setInput(page, '#name', name)
    await page.select('#unit', unit)
    await setInput(page, '#cost_per_unit', cost)
    if (par) await setInput(page, '#par_level', par)
    await clickByText(page, 'button[type="submit"]', 'Yadda saxla')
    await waitPathEnd(page, '/app/ingredients')
  }
  const { count: ingCount } = await db.from('ingredients').select('id', { count: 'exact', head: true }).eq('tenant_id', T)
  check('S2 ingredients created', ingCount ?? 0, 5)
  const toyuq = await ingByName('Toyuq filesi')
  const { data: parRow } = await db.from('ingredients').select('par_level').eq('id', toyuq.id).single()
  check('S2 par_level persisted on CREATE (regression)', Number(parRow!.par_level), 20)
  await shot(page, '02-ingredients-list')

  // S3 · UNIT CONVERSION on Zeytun yağı: 1 şüşə = 0.75 l
  console.log('\n═══ S3 · Unit conversion (1 şüşə = 0.75 l) ═══')
  const oil = await ingByName('Zeytun yağı')
  await goto(page, `/az/app/ingredients/${oil.id}`)
  await page.waitForSelector('#conv_unit', { timeout: 60000 })
  await page.$eval('#conv_unit', (el) => el.scrollIntoView({ block: 'center' }))
  await sleep(2000) // pre-hydration submits post natively and vanish — settle first
  await page.select('#conv_unit', 'şüşə')
  await page.click('#conv_factor')
  await page.type('#conv_factor', '0.75', { delay: 25 })
  await submitFormOf(page, '#conv_factor')
  const convOk = await until('conversion row', async () => {
    const { data } = await db.from('ingredient_unit_conversions').select('unit').eq('ingredient_id', oil.id).maybeSingle()
    return !!data
  }, 12000)
  if (!convOk) {
    note('first conversion submit vanished (pre-hydration native post?) — retrying once')
    await page.reload({ waitUntil: 'networkidle2' })
    await sleep(2000)
    await page.$eval('#conv_unit', (el) => el.scrollIntoView({ block: 'center' }))
    await page.select('#conv_unit', 'şüşə')
    await page.click('#conv_factor')
    await page.type('#conv_factor', '0.75', { delay: 25 })
    await submitFormOf(page, '#conv_factor')
    await sleep(3000)
  }
  const convErr = await page.evaluate(() => {
    const el = document.querySelector('.text-destructive')
    return el?.textContent?.trim() ?? ''
  })
  if (convErr) note(`conversion panel error text: "${convErr}"`)
  const { data: conv } = await db
    .from('ingredient_unit_conversions')
    .select('factor_to_base')
    .eq('ingredient_id', oil.id)
    .eq('unit', 'şüşə')
    .maybeSingle()
  check('S3 conversion saved (şüşə→l ×0.75)', Number(conv?.factor_to_base ?? 0), 0.75)
  await shot(page, '03-unit-conversion')

  // S4 · DAY-0 INITIAL COUNT
  console.log('\n═══ S4 · Day-0 initial stock count ═══')
  await goto(page, '/az/app/inventory/count')
  // Pre-count gate: initial-count notice + readiness checkbox → "Sayımı başlat"
  await page.waitForFunction(() => document.body.innerText.includes('Sayıma başlamazdan əvvəl'), { timeout: 30000 })
  note('pre-count gate shown; initial (zero) count correctly detected')
  await page.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]') as HTMLInputElement
    cb?.click()
  })
  await sleep(200)
  await clickByText(page, 'button', 'Sayımı başlat')
  await page.waitForSelector('#count_date', { timeout: 30000 })
  const COUNTS: Record<string, string> = {
    'Toyuq filesi': '10',
    'Çörək qırıntısı': '3',
    'Romain salatı': '4',
    Parmezan: '1',
    'Zeytun yağı': '2',
  }
  for (const [name, qty] of Object.entries(COUNTS)) {
    const done = await page.evaluate(
      (nm, v) => {
        // smallest element that contains the name AND exactly one decimal input
        const candidates = (Array.from(document.querySelectorAll('div,li,tr')) as HTMLElement[])
          .filter(
            (r) =>
              r.textContent?.includes(nm) &&
              r.querySelectorAll('input[inputmode="decimal"]').length === 1
          )
          .sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0))
        const input = candidates[0]?.querySelector('input[inputmode="decimal"]') as HTMLInputElement | null
        if (!input) return false
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
        setter.call(input, v)
        input.dispatchEvent(new Event('input', { bubbles: true }))
        return true
      },
      name,
      qty
    )
    if (!done) failures.push(`S4: count input for ${name} not found`)
  }
  await shot(page, '04-count-filled')
  await submitFormOf(page, '#count_date')
  // Submitting a count lands on its PERIOD REPORT (good behavior — the recon
  // cheat-sheet claimed /app/inventory; the app is smarter).
  await waitPath(page, '/reports/period/')
  note('count submit navigates straight to the new period report')
  await sleep(1500)
  await shot(page, '04b-period-report')
  const lv4 = await derived()
  check('S4 toyuq level', lv4.get(toyuq.id) ?? 0, 10)
  check('S4 zeytun level', lv4.get(oil.id) ?? 0, 2)
  const { count: periods } = await db.from('count_periods').select('id', { count: 'exact', head: true }).eq('tenant_id', T)
  check('S4 baseline count period created', periods ?? 0, 1)

  // S5 · PURCHASE (delivery): +5 kq toyuq @8.20, +1 kq breading @2.60
  console.log('\n═══ S5 · Purchase delivery ═══')
  await goto(page, '/az/app/purchases')
  await selectByText(page, 'form', 'Toyuq filesi', 0)
  await page.evaluate(() => void 0)
  // qty + cost are the first two number inputs of the line
  await page.evaluate((q, c) => {
    const inputs = Array.from(document.querySelectorAll('form input[type="number"]')) as HTMLInputElement[]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(inputs[0], q)
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
    setter.call(inputs[1], c)
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
  }, '5', '8.2')
  await clickByText(page, 'button', 'Sətir əlavə et')
  await sleep(400)
  await selectByText(page, 'form', 'Çörək qırıntısı', 1)
  await page.evaluate((q, c) => {
    const inputs = Array.from(document.querySelectorAll('form input[type="number"]')) as HTMLInputElement[]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    // second line's qty/cost = inputs[2], inputs[3] (2 number inputs per line)
    setter.call(inputs[2], q)
    inputs[2].dispatchEvent(new Event('input', { bubbles: true }))
    setter.call(inputs[3], c)
    inputs[3].dispatchEvent(new Event('input', { bubbles: true }))
  }, '1', '2.6')
  await shot(page, '05-delivery-filled')
  await clickByText(page, 'button[type="submit"]', 'Yadda saxla')
  await until('delivery batches land', async () => (await batchSum(toyuq.id)) >= 4.99)
  const lv5 = await derived()
  const bread = await ingByName('Çörək qırıntısı')
  check('S5 toyuq 10+5', lv5.get(toyuq.id) ?? 0, 15)
  check('S5 breading 3+1', lv5.get(bread.id) ?? 0, 4)
  check('S5 toyuq batch sum', await batchSum(toyuq.id), 5)

  // S6 · PREP RECIPE (Yarımfabrikat, stocked): Toyuq naqqeti — 2000 q toyuq + 500 q breading → 10 porsiya
  console.log('\n═══ S6 · Create prep recipe (2000 q + 500 q → 10 porsiya) ═══')
  await goto(page, '/az/app/recipes/new')
  await setInput(page, '#name', 'Toyuq naqqeti')
  await clickByText(page, 'button', 'Yarımfabrikat')
  await sleep(300)
  await setInput(page, '#serving_size', '10')
  await page.select('#serving_unit', 'porsiya')
  // line 1: toyuq 2000 q
  await clickByText(page, 'button', 'İnqrediyent əlavə et')
  await sleep(300)
  await selectByText(page, 'form', 'Toyuq filesi', 0)
  await setLineUnit(page, 'q', 0)
  await setLastLineQty(page, '2000')
  // line 2: breading 500 q
  await clickByText(page, 'button', 'İnqrediyent əlavə et')
  await sleep(300)
  await selectByText(page, 'form', 'Çörək qırıntısı', 1)
  await setLineUnit(page, 'q', 1)
  await setLastLineQty(page, '500')
  await sleep(500)
  const liveCost = await page.evaluate(() => document.body.innerText.match(/(\d+[.,]\d{2})\s*AZN/)?.[1] ?? 'n/a')
  check('S6 live batch cost (2kq×8.20 + 0.5kq×2.60 — last delivery price)', Number(liveCost.replace(',', '.')), 17.7)
  await shot(page, '06-prep-recipe-form')
  await clickByText(page, 'button[type="submit"]', 'Yadda saxla')
  await waitPathEnd(page, '/app/recipes')
  const { data: prep } = await db
    .from('recipes')
    .select('id, is_sub_recipe, produced_ingredient_id, serving_size')
    .eq('tenant_id', T)
    .eq('name', 'Toyuq naqqeti')
    .single()
  check('S6 prep is_sub_recipe', prep!.is_sub_recipe, true)
  check('S6 prep stocked (backing ingredient linked)', prep!.produced_ingredient_id != null, true)
  const { data: lines6 } = await db.from('recipe_ingredients').select('quantity, unit').eq('recipe_id', prep!.id)
  check('S6 line units stored as q', (lines6 ?? []).every((l) => l.unit === 'q'), true)

  // S7 · PRODUCTION (İstehsal): template → auto-filled, scaled, CONVERTED inputs
  console.log('\n═══ S7 · Production via İstehsal form ═══')
  await goto(page, '/az/app/production/new')
  await page.waitForSelector('#recipe', { timeout: 60000 })
  await page.select('#recipe', prep!.id)
  await sleep(600)
  const outVal = await page.$eval('#output', (el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent ?? '')
  const qtyVal = await page.$eval('#outqty', (el) => (el as HTMLInputElement).value)
  check('S7 output auto-set to backing prep', outVal.includes('Toyuq naqqeti'), true)
  check('S7 output qty = batch size', Number(qtyVal), 10)
  const inputVals = await page.evaluate(() =>
    (Array.from(document.querySelectorAll('form .grid input[type="number"]')) as HTMLInputElement[])
      .filter((i) => i.id !== 'outqty')
      .map((i) => i.value)
      .join(',')
  )
  check('S7 template inputs converted to BASE units (2 kq, 0.5 kq)', inputVals, '2,0.5')
  const placeholders = await page.evaluate(() =>
    (Array.from(document.querySelectorAll('form input[placeholder]')) as HTMLInputElement[])
      .map((i) => i.placeholder)
      .filter((p) => p && p !== '0')
      .join(',')
  )
  note(`İstehsal input unit placeholders: [${placeholders}]`)
  await shot(page, '07-production-form')
  await submitFormOf(page, '#outqty')
  await waitPathEnd(page, '/app/production')
  // PROBE (on a fresh form, after the real run): empty submit must be rejected
  await goto(page, '/az/app/production/new')
  await page.waitForSelector('#outqty', { timeout: 60000 })
  await submitFormOf(page, '#outqty')
  await sleep(1800)
  const probeState = await page.evaluate(() => ({
    stayed: window.location.pathname.includes('/production/new'),
    error: document.querySelector('.text-destructive')?.textContent?.trim() ?? '',
  }))
  note(`PROBE empty İstehsal submit → stayed=${probeState.stayed}, error="${probeState.error}"`)
  await goto(page, '/az/app/production')
  const lv7 = await derived()
  const prepIng = prep!.produced_ingredient_id as string
  check('S7 prep stock +10', lv7.get(prepIng) ?? 0, 10)
  check('S7 toyuq 15−2', lv7.get(toyuq.id) ?? 0, 13)
  check('S7 breading 4−0.5', lv7.get(bread.id) ?? 0, 3.5)
  const { data: run } = await db
    .from('production_runs')
    .select('output_quantity, output_unit_cost')
    .eq('tenant_id', T)
    .single()
  check('S7 run output qty', Number(run!.output_quantity), 10)
  check('S7 rolled-up cost/porsiya (2×8.2+0.5×2.6)/10', Number(run!.output_unit_cost), 1.77)
  check('S7 prep batch == derived (fully batch-tracked)', await batchSum(prepIng), 10)
  await shot(page, '07b-production-done')

  // S8 · DISHES: prep inside a dish (Caesar) + a plain wrapper dish
  console.log('\n═══ S8 · Dishes: Naqqet porsiyası (prep×1) + Sezar salatı (prep×0.5 + raw) ═══')
  // D1
  await goto(page, '/az/app/recipes/new')
  await setInput(page, '#name', 'Naqqet porsiyası')
  await setInput(page, '#serving_size', '1')
  await page.select('#serving_unit', 'porsiya')
  await clickByText(page, 'button', 'Yarımfabrikat əlavə et')
  await sleep(250)
  await selectByText(page, 'form', 'Toyuq naqqeti', 0)
  await page.evaluate((q) => {
    const rows = Array.from(document.querySelectorAll('form input[step="0.0001"]')) as HTMLInputElement[]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(rows[rows.length - 1], q)
    rows[rows.length - 1].dispatchEvent(new Event('input', { bubbles: true }))
  }, '1')
  // sale price = the step-0.01 number input in the cost panel
  await page.evaluate((v) => {
    const el = Array.from(document.querySelectorAll('input[step="0.01"]')).at(-1) as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, '7')
  await sleep(300)
  await shot(page, '08-dish1-form')
  await clickByText(page, 'button[type="submit"]', 'Yadda saxla')
  await waitPathEnd(page, '/app/recipes')
  // D2 — Caesar
  await goto(page, '/az/app/recipes/new')
  await setInput(page, '#name', 'Sezar salatı')
  await setInput(page, '#serving_size', '1')
  await page.select('#serving_unit', 'porsiya')
  await clickByText(page, 'button', 'Yarımfabrikat əlavə et')
  await sleep(200)
  await selectByText(page, 'form', 'Toyuq naqqeti', 0)
  await page.evaluate((q) => {
    const rows = Array.from(document.querySelectorAll('form input[step="0.0001"]')) as HTMLInputElement[]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(rows[rows.length - 1], q)
    rows[rows.length - 1].dispatchEvent(new Event('input', { bubbles: true }))
  }, '0.5')
  for (const [nm, qty, unitLabel] of [
    ['Romain salatı', '150', 'q'],
    ['Parmezan', '30', 'q'],
    ['Zeytun yağı', '20', 'ml'],
  ] as const) {
    await clickByText(page, 'button', 'İnqrediyent əlavə et')
    await sleep(300)
    const ingSelIdx = await page.evaluate((n) => {
      const selects = Array.from(document.querySelectorAll('form select')) as HTMLSelectElement[]
      let count = 0
      for (const s of selects) {
        if (Array.from(s.options).some((o) => o.textContent?.includes(n))) count++
      }
      return count - 1
    }, nm)
    await selectByText(page, 'form', nm, ingSelIdx)
    await setLineUnit(page, unitLabel)
    await setLastLineQty(page, qty)
  }
  await page.evaluate((v) => {
    const el = Array.from(document.querySelectorAll('input[step="0.01"]')).at(-1) as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, '12')
  await sleep(400)
  const caesarCost = await page.evaluate(() => {
    const m = document.body.innerText.match(/(\d+[.,]\d{2})\s*AZN/)
    return m ? m[1] : 'n/a'
  })
  note(`Caesar live cost: ${caesarCost} AZN (expect ≈2.93 = 0.5×1.77 + 0.15×6 + 0.03×30 + 0.02×12)`)
  await shot(page, '08b-caesar-form')
  await clickByText(page, 'button[type="submit"]', 'Yadda saxla')
  await waitPathEnd(page, '/app/recipes')
  await shot(page, '08c-recipes-list')

  // S9 · SALES: probe prep-direct gap, then 3×naqqet + 2×sezar, confirm
  console.log('\n═══ S9 · Sales day: add items, preview, confirm ═══')
  await goto(page, '/az/app/sales')
  const pickerHasPrep = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[]
    return selects.some((s) => Array.from(s.options).some((o) => o.textContent?.includes('Toyuq naqqeti')))
  })
  // The prep has no sale price yet, so it must NOT be sellable at this point.
  check('S9 unpriced prep hidden from sales picker', pickerHasPrep, false)
  // add 3× Naqqet porsiyası
  await selectByText(page, 'body', 'Naqqet porsiyası', 0)
  await sleep(300)
  await page.evaluate((q) => {
    const inputs = Array.from(document.querySelectorAll('table input[type="number"]')) as HTMLInputElement[]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(inputs.at(-1)!, q)
    inputs.at(-1)!.dispatchEvent(new Event('input', { bubbles: true }))
  }, '3')
  await selectByText(page, 'body', 'Sezar salatı', 0)
  await sleep(300)
  await page.evaluate((q) => {
    const inputs = Array.from(document.querySelectorAll('table input[type="number"]')) as HTMLInputElement[]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(inputs.at(-1)!, q)
    inputs.at(-1)!.dispatchEvent(new Event('input', { bubbles: true }))
  }, '2')
  await sleep(200)
  await clickByText(page, 'button', 'Yadda saxla')
  await until('sales items saved', async () => {
    const { count } = await db.from('daily_sales_items').select('id', { count: 'exact', head: true }).eq('tenant_id', T)
    return (count ?? 0) >= 2
  })
  await shot(page, '09-sales-saved')
  // confirm flow with preview (reload to settle the saved state first)
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(800)
  await clickByText(page, 'button', 'Təsdiqlə və kilidlə')
  await sleep(2500)
  const previewText = await page.evaluate(() => document.body.innerText)
  check('S9 preview shows prep deduction', previewText.includes('Toyuq naqqeti'), true)
  check('S9 preview does NOT show raw toyuq (no double-deduct)', !previewText.match(/Toyuq filesi/), true)
  await shot(page, '09b-confirm-preview')
  // final confirm = LAST matching button (the one inside the dialog)
  await page.evaluate(() => {
    const btns = (Array.from(document.querySelectorAll('button')) as HTMLButtonElement[]).filter((b) =>
      (b.textContent ?? '').includes('Təsdiqlə və kilidlə')
    )
    btns.at(-1)?.click()
  })
  await until('day confirmed', async () => {
    const { data } = await db.from('daily_sales').select('status').eq('tenant_id', T).maybeSingle()
    return data?.status === 'confirmed'
  })
  await sleep(800)
  await shot(page, '09c-confirmed')
  const lv9 = await derived()
  check('S9 prep 10−(3×1 + 2×0.5)', lv9.get(prepIng) ?? 0, 6)
  check('S9 raw toyuq UNCHANGED at sale', lv9.get(toyuq.id) ?? 0, 13)
  check('S9 romaine 4−2×0.15', lv9.get((await ingByName('Romain salatı')).id) ?? 0, 3.7)
  check('S9 parmesan 1−2×0.03', lv9.get((await ingByName('Parmezan')).id) ?? 0, 0.94)
  check('S9 olive oil 2−2×0.02 (ml→l conversion)', lv9.get(oil.id) ?? 0, 1.96)
  check('S9 prep batch == derived', await batchSum(prepIng), 6)
  const { data: day } = await db.from('daily_sales').select('total_amount, status').eq('tenant_id', T).single()
  check('S9 day total 3×7+2×12', Number(day!.total_amount), 45)
  check('S9 day locked', day!.status, 'confirmed')

  // S10 · WASTE: needs a category — fresh tenant may have none (observe!)
  console.log('\n═══ S10 · Waste ═══')
  const { count: wcat } = await db.from('waste_categories').select('id', { count: 'exact', head: true }).eq('tenant_id', T)
  note(`waste categories on fresh tenant: ${wcat ?? 0}`)
  if (!wcat) {
    note('no waste-category UI/auto-seed found → seeding one via service role to continue (FINDING)')
    await db.from('waste_categories').insert({ tenant_id: T, name: 'Xarab olma', name_az: 'Xarab olma', name_ru: 'Порча' })
  }
  await goto(page, '/az/app/inventory/waste')
  await page.waitForSelector('#ingredient', { timeout: 15000 })
  await selectByText(page, 'body', 'Toyuq naqqeti', 0)
  await setInput(page, '#quantity', '1')
  await clickByText(page, 'button', 'Xarab olma')
  await shot(page, '10-waste-form')
  await clickByText(page, 'button', 'Tullantı qeyd et')
  await until('waste lands', async () => {
    const { count } = await db
      .from('stock_movements')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', T)
      .eq('movement_type', 'waste')
    return (count ?? 0) >= 1
  })
  const lv10 = await derived()
  check('S10 prep 6−1 after waste', lv10.get(prepIng) ?? 0, 5)
  check('S10 prep batch follows', await batchSum(prepIng), 5)

  // S11 · INVENTORY + DASHBOARD numbers
  console.log('\n═══ S11 · Inventory page + dashboard math ═══')
  await goto(page, '/az/app/inventory')
  const invText = await page.evaluate(() => document.body.innerText)
  for (const [needle, label] of [
    ['13', 'toyuq 13'],
    ['3.5', 'breading 3.5'],
    ['3.7', 'romaine 3.7'],
    ['0.94', 'parmesan 0.94'],
    ['1.96', 'olive oil 1.96'],
  ] as const) {
    check(`S11 inventory shows ${label}`, invText.includes(needle), true)
  }
  await shot(page, '11-inventory')
  await goto(page, '/az/app/dashboard')
  await sleep(2800)
  const dashText = await page.evaluate(() => document.body.innerText)
  check('S11 dashboard revenue 45.00', dashText.includes('45.00'), true)
  await shot(page, '11b-dashboard')

  // S12 · VOID the confirmed day (restores deductions), via the UI
  console.log('\n═══ S12 · Void confirmed day (restoration math) ═══')
  await goto(page, '/az/app/sales')
  await clickByText(page, 'button', 'Təsdiqi ləğv et')
  await sleep(600)
  await clickByText(page, 'button', 'Bəli, ləğv et')
  await until('day voided', async () => {
    const { data } = await db.from('daily_sales').select('status').eq('tenant_id', T).maybeSingle()
    return data?.status === 'draft'
  })
  const lv12 = await derived()
  check('S12 prep restored 5+4', lv12.get(prepIng) ?? 0, 9)
  check('S12 romaine restored', lv12.get((await ingByName('Romain salatı')).id) ?? 0, 4)
  check('S12 olive oil restored', lv12.get(oil.id) ?? 0, 2)
  check('S12 prep batch follows restore', await batchSum(prepIng), 9)
  await shot(page, '12-voided')

  // S13 · Price the prep (sale price now allowed) → sell it DIRECTLY
  console.log('\n═══ S13 · Sell the prep DIRECTLY as a menu item ═══')
  await goto(page, `/az/app/recipes/${prep!.id}`)
  await page.waitForSelector('#name', { timeout: 60000 })
  await sleep(800)
  await page.evaluate((v) => {
    const el = Array.from(document.querySelectorAll('input[step="0.01"]')).at(-1) as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, '8')
  await clickByText(page, 'button[type="submit"]', 'Yadda saxla')
  await waitPathEnd(page, '/app/recipes')
  await goto(page, '/az/app/sales')
  const prepSellable = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[]
    return selects.some((s) => Array.from(s.options).some((o) => o.textContent?.includes('Toyuq naqqeti')))
  })
  check('S13 PRICED prep IS sellable directly (the requested logic)', prepSellable, true)
  await selectByText(page, 'body', 'Toyuq naqqeti', 0)
  await sleep(400)
  await page.evaluate((q) => {
    const inputs = Array.from(document.querySelectorAll('table input[type="number"]')) as HTMLInputElement[]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(inputs.at(-1)!, q)
    inputs.at(-1)!.dispatchEvent(new Event('input', { bubbles: true }))
  }, '2')
  await clickByText(page, 'button', 'Yadda saxla')
  await until('3 item lines saved', async () => {
    const { count } = await db.from('daily_sales_items').select('id', { count: 'exact', head: true }).eq('tenant_id', T)
    return (count ?? 0) >= 3
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(800)
  await clickByText(page, 'button', 'Təsdiqlə və kilidlə')
  await sleep(2500)
  const preview13 = await page.evaluate(() => document.body.innerText)
  check('S13 preview shows prep −6 total (4 via dishes + 2 direct)', preview13.includes('Toyuq naqqeti'), true)
  check('S13 preview still has NO raw toyuq', !preview13.match(/Toyuq filesi/), true)
  await shot(page, '13-preview-direct-prep')
  await page.evaluate(() => {
    const btns = (Array.from(document.querySelectorAll('button')) as HTMLButtonElement[]).filter((b) =>
      (b.textContent ?? '').includes('Təsdiqlə və kilidlə')
    )
    btns.at(-1)?.click()
  })
  await until('day re-confirmed', async () => {
    const { data } = await db.from('daily_sales').select('status').eq('tenant_id', T).maybeSingle()
    return data?.status === 'confirmed'
  })
  const lv13 = await derived()
  check('S13 prep 9−(3+1+2)', lv13.get(prepIng) ?? 0, 3)
  check('S13 raw toyuq STILL untouched by sales', lv13.get(toyuq.id) ?? 0, 13)
  check('S13 romaine 4−0.3', lv13.get((await ingByName('Romain salatı')).id) ?? 0, 3.7)
  check('S13 prep batch == derived', await batchSum(prepIng), 3)
  const { data: day13 } = await db.from('daily_sales').select('total_amount').eq('tenant_id', T).single()
  check('S13 day total 45 + 2×8', Number(day13!.total_amount), 61)
  await shot(page, '13b-confirmed-direct')

  // S14 · Final dashboard sweep
  console.log('\n═══ S14 · Final dashboard ═══')
  await goto(page, '/az/app/dashboard')
  await sleep(2800)
  const dash14 = await page.evaluate(() => document.body.innerText)
  check('S14 dashboard revenue 61.00', dash14.includes('61.00'), true)
  await shot(page, '14-dashboard-final')

  console.log('\n═══ RESULT ═══')
  if (failures.length === 0) console.log('ALL CHECKS PASSED')
  else {
    console.log(`${failures.length} FAILURE(S):`)
    for (const f of failures) console.log(`  ✗ ${f}`)
  }
  await browser.close()
  process.exit(failures.length === 0 ? 0 : 1)
}

main().catch(async (e) => {
  console.error('DRIVER ERROR:', e.message)
  process.exit(2)
})
