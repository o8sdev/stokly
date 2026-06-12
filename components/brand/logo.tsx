import { cn } from '@/lib/utils'

/* ── Stokly brand mark ──────────────────────────────────────────────────────
   The mark is a hand-set asterisk — the chef's annotation, the ledger's
   footnote star, the stamp on a checked receipt. Six rounded spokes, tilted
   8° so it reads stamped rather than typeset. Drawn as paths (not a font
   glyph) so it renders identically everywhere.                              */

export type LogoTone = 'ink' | 'paper' | 'brand'

const TONE: Record<LogoTone, { text: string; mark: string }> = {
  // Ink wordmark + teal mark — light (paper/white) surfaces.
  ink: { text: '#1c1a14', mark: '#00C896' },
  // Paper wordmark + teal mark — dark (ink/navy) surfaces.
  paper: { text: '#f4f1e8', mark: '#00C896' },
  // Everything teal — the app sidebar's existing accent style.
  brand: { text: '#00C896', mark: '#00C896' },
}

// Six rounded spokes from an inner radius to the rim, pre-tilted 8°.
export function StoklyMark({
  size = 18,
  color = '#00C896',
  className,
}: {
  size?: number
  color?: string
  className?: string
}) {
  const spokes = []
  for (let i = 0; i < 6; i++) {
    const a = ((i * 60 + 8) * Math.PI) / 180
    const x1 = 24 + Math.cos(a) * 5.5
    const y1 = 24 + Math.sin(a) * 5.5
    const x2 = 24 + Math.cos(a) * 19
    const y2 = 24 + Math.sin(a) * 19
    spokes.push(
      <line
        key={i}
        x1={x1.toFixed(2)}
        y1={y1.toFixed(2)}
        x2={x2.toFixed(2)}
        y2={y2.toFixed(2)}
      />
    )
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke={color}
      strokeWidth="7"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      {spokes}
    </svg>
  )
}

// Lockup: wordmark + the mark riding the cap-height like a footnote star.
export function StoklyLogo({
  tone = 'ink',
  size = 'md',
  className,
}: {
  tone?: LogoTone
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const t = TONE[tone]
  const text =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-lg' : 'text-xl'
  const mark = size === 'lg' ? 15 : size === 'sm' ? 11 : 13
  return (
    <span className={cn('inline-flex items-start gap-[3px]', className)}>
      <span
        className={cn('font-display font-bold leading-none tracking-tight', text)}
        style={{ color: t.text }}
      >
        Stokly
      </span>
      <StoklyMark size={mark} color={t.mark} className="mt-[1px]" />
    </span>
  )
}
