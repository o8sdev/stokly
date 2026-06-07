import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format a money value with 2 decimals and the AZN suffix.
export function formatMoney(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return `${n.toFixed(2)} AZN`
}

// Format a numeric quantity with up to 3 decimals (trailing zeros trimmed).
export function formatQuantity(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return n
    .toFixed(3)
    .replace(/\.?0+$/, (m) => (m.includes('.') ? '' : m))
}

// Format a percentage value with 1 decimal and a % suffix.
export function formatPercent(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return `${n.toFixed(1)}%`
}

// Format an ISO timestamp as a short local date, or em-dash when missing.
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('az-AZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Relative time like "2 saat əvvəl" / "2 часа назад", localised.
export function formatRelativeTime(
  value: string | null | undefined,
  locale: string
): string {
  if (!value) return '—'
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return '—'
  const diffMs = then - Date.now()
  const diffSec = Math.round(diffMs / 1000)

  const rtf = new Intl.RelativeTimeFormat(locale === 'ru' ? 'ru' : 'az', {
    numeric: 'auto',
  })

  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.34524, 'week'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ]

  let unitValue = diffSec
  for (const [amount, unit] of divisions) {
    if (Math.abs(unitValue) < amount) {
      return rtf.format(Math.round(unitValue), unit)
    }
    unitValue = unitValue / amount
  }
  // Fallback (should be unreachable).
  return rtf.format(0, 'second')
}
