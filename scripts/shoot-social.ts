/* Capture social-media screenshots of the landing page + logged-in dashboards
   using the locally installed Chrome (puppeteer-core, no browser download).
   Requires: dev server on BASE_URL + the seeded demo login (seed-demo.ts).

   Run:  npx -y tsx scripts/shoot-social.ts
   Out:  social-shots/*.png (retina 2x)                                       */
import puppeteer, { type Page } from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const BASE = process.env.SHOT_BASE_URL ?? 'http://localhost:3000'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = 'social-shots'
const EMAIL = 'demo@stokly.app'
const PASSWORD = 'StoklyDemo2026!'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Force scroll-reveal content visible for full-page captures.
async function showReveals(page: Page) {
  await page.addStyleTag({
    content:
      '.mk-reveal{opacity:1 !important;transform:none !important;filter:none !important}',
  })
  await sleep(150)
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--hide-scrollbars', '--force-color-profile=srgb'],
  })
  const page = await browser.newPage()

  // ── Landing (desktop) ────────────────────────────────────────────────────
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 })
  await page.goto(`${BASE}/az`, { waitUntil: 'networkidle0', timeout: 90_000 })
  await sleep(1200) // hero reveals settle
  await page.screenshot({ path: `${OUT}/landing-hero.png` })
  console.log('✓ landing-hero')

  await showReveals(page)
  await page.screenshot({ path: `${OUT}/landing-full.png`, fullPage: true })
  console.log('✓ landing-full')

  const pricing = await page.$('#pricing')
  const box = pricing ? await pricing.boundingBox() : null
  if (box) {
    await page.screenshot({
      path: `${OUT}/landing-pricing.png`,
      clip: {
        x: 0,
        y: Math.max(0, box.y - 24),
        width: 1440,
        height: Math.min(box.height + 48, 1400),
      },
    })
    console.log('✓ landing-pricing')
  }

  // ── Landing (mobile) ─────────────────────────────────────────────────────
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 })
  await page.goto(`${BASE}/az`, { waitUntil: 'networkidle0' })
  await sleep(1200)
  await page.screenshot({ path: `${OUT}/landing-mobile-hero.png` })
  console.log('✓ landing-mobile-hero')

  // ── Login as the demo owner ──────────────────────────────────────────────
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 })
  await page.goto(`${BASE}/az/app/login`, { waitUntil: 'networkidle0' })
  await page.type('#email', EMAIL)
  await page.type('#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForFunction(
    () => window.location.pathname.includes('/app/dashboard'),
    { timeout: 45_000 }
  )
  await page.waitForSelector('text/Gəlir', { timeout: 30_000 }).catch(() => {})
  await sleep(2200) // count-up + chart animation settle
  await page.screenshot({ path: `${OUT}/dashboard.png` })
  console.log('✓ dashboard')

  // The app shell scrolls inside an inner container, so fullPage can't expand
  // it — use a tall viewport to fit the whole dashboard in one frame instead.
  await page.setViewport({ width: 1440, height: 1700, deviceScaleFactor: 2 })
  await page.reload({ waitUntil: 'networkidle0' })
  await sleep(2200)
  await page.screenshot({ path: `${OUT}/dashboard-full.png` })
  console.log('✓ dashboard-full')
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 })

  // ── Finances (P&L) ───────────────────────────────────────────────────────
  await page.setViewport({ width: 1440, height: 1500, deviceScaleFactor: 2 })
  await page.goto(`${BASE}/az/app/data/finances`, { waitUntil: 'networkidle0' })
  await sleep(1200)
  await page.screenshot({ path: `${OUT}/finances.png` })
  console.log('✓ finances')
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 })

  // ── Sales explorer ───────────────────────────────────────────────────────
  await page.goto(`${BASE}/az/app/data/sales`, { waitUntil: 'networkidle0' })
  await sleep(800)
  await page.screenshot({ path: `${OUT}/sales-log.png` })
  console.log('✓ sales-log')

  await browser.close()
  console.log(`\nDone → ${OUT}/`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
