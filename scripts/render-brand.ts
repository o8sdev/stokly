/* Render the Stokly brand PNGs from the vector mark via installed Chrome:
     app/apple-icon.png          180×180   ink tile + teal mark
     app/opengraph-image.png     1200×630  paper OG card (lockup + tagline)
     social-shots/brand/*.png    IG profile tiles, lockups, transparent mark
   Run:  npx -y tsx scripts/render-brand.ts                                   */
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// Same geometry as components/brand/logo.tsx — six rounded spokes, 8° tilt.
function markSvg(size: number, color: string, stroke = 7): string {
  let lines = ''
  for (let i = 0; i < 6; i++) {
    const a = ((i * 60 + 8) * Math.PI) / 180
    const x1 = (24 + Math.cos(a) * 5.5).toFixed(2)
    const y1 = (24 + Math.sin(a) * 5.5).toFixed(2)
    const x2 = (24 + Math.cos(a) * 19).toFixed(2)
    const y2 = (24 + Math.sin(a) * 19).toFixed(2)
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round">${lines}</svg>`
}

const FONT = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">`
const INK = '#1c1a14'
const PAPER = '#f4f1e8'
const TEAL = '#00C896'

function lockup(markPx: number, fontPx: number, text: string, mark: string): string {
  return `<div style="display:inline-flex;align-items:flex-start;gap:${Math.round(markPx * 0.25)}px">
    <span style="font-family:'Bricolage Grotesque';font-weight:800;font-size:${fontPx}px;line-height:1;letter-spacing:-0.02em;color:${text}">Stokly</span>
    <span style="margin-top:${Math.round(fontPx * 0.04)}px">${markSvg(markPx, mark)}</span>
  </div>`
}

async function shot(
  page: import('puppeteer-core').Page,
  html: string,
  w: number,
  h: number,
  path: string,
  transparent = false
) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await page.setContent(
    `<!doctype html><html><head>${FONT}<style>*{margin:0;padding:0}body{width:${w}px;height:${h}px;overflow:hidden}</style></head><body>${html}</body></html>`,
    { waitUntil: 'load', timeout: 60_000 }
  )
  // networkidle0 hangs on the font CDN's keep-alive connections — fonts.ready
  // is the actual signal that text can be painted with the webfont.
  await page.evaluate(() => (document as Document & { fonts: FontFaceSet }).fonts.ready)
  await new Promise((r) => setTimeout(r, 250))
  await page.screenshot({ path: path as `${string}.png`, omitBackground: transparent })
  console.log(`✓ ${path}`)
}

async function main() {
  mkdirSync('social-shots/brand', { recursive: true })
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
  const page = await browser.newPage()

  const center = (inner: string, bg: string, radius = 0) =>
    `<div style="width:100%;height:100%;background:${bg};display:flex;align-items:center;justify-content:center;${radius ? `border-radius:${radius}px;` : ''}">${inner}</div>`

  // App icons
  await shot(page, center(markSvg(112, TEAL, 6), INK), 180, 180, 'app/apple-icon.png')

  // OG card: ruled paper + red margin + lockup + mono tagline + stamp corner.
  const og = `
  <div style="position:relative;width:1200px;height:630px;background:
      repeating-linear-gradient(to bottom, transparent 0, transparent 39px, rgba(28,26,20,0.05) 39px, rgba(28,26,20,0.05) 40px),
      ${PAPER};">
    <div style="position:absolute;top:0;bottom:0;left:72px;width:1px;background:rgba(194,70,46,0.35)"></div>
    <div style="position:absolute;left:120px;top:185px">${lockup(64, 120, INK, TEAL)}</div>
    <div style="position:absolute;left:124px;top:330px;font-family:'JetBrains Mono';font-weight:500;font-size:21px;letter-spacing:0.18em;color:#5b574a;text-transform:uppercase">Restoran anbarı · Maya dəyəri · İtkilər</div>
    <div style="position:absolute;left:124px;top:375px;font-family:'JetBrains Mono';font-size:15px;letter-spacing:0.12em;color:#8e8a7b">* * * hər axşam · avtomatik * * *</div>
    <div style="position:absolute;right:64px;top:54px;transform:rotate(-7deg);border:3px solid ${TEAL};color:${TEAL};opacity:.9;border-radius:8px;padding:8px 16px;font-family:'JetBrains Mono';font-weight:500;font-size:18px;letter-spacing:0.22em;text-transform:uppercase">✓ Hesablandı</div>
  </div>`
  await shot(page, og, 1200, 630, 'app/opengraph-image.png')

  // IG profile tiles (1080²)
  await shot(page, center(markSvg(560, TEAL, 6.4), INK), 1080, 1080, 'social-shots/brand/profile-ink-1080.png')
  await shot(page, center(markSvg(560, TEAL, 6.4), PAPER), 1080, 1080, 'social-shots/brand/profile-paper-1080.png')

  // Lockup tiles
  await shot(page, center(lockup(110, 200, INK, TEAL), PAPER), 1080, 1080, 'social-shots/brand/logo-paper-1080.png')
  await shot(page, center(lockup(110, 200, PAPER, TEAL), INK), 1080, 1080, 'social-shots/brand/logo-ink-1080.png')

  // Transparent mark (for overlays in design tools)
  await shot(page, center(markSvg(440, TEAL, 6.4), 'transparent'), 512, 512, 'social-shots/brand/mark-teal-512.png', true)
  await shot(page, center(markSvg(440, INK, 6.4), 'transparent'), 512, 512, 'social-shots/brand/mark-ink-512.png', true)

  await browser.close()
  console.log('\nBrand assets rendered.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
