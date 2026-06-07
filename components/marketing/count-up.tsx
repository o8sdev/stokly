'use client'

import { useEffect, useRef, useState } from 'react'

// Deterministic number formatting (NOT toLocaleString) so server and client
// render byte-identical text — toLocaleString's ICU data differs between Node
// and the browser ("0.0" vs "0,0"), which causes hydration mismatches.
function formatNumber(n: number, decimals: number): string {
  const fixed = n.toFixed(decimals)
  const [intPart, decPart] = fixed.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return decPart ? `${grouped},${decPart}` : grouped
}

// Counts from 0 → `to` once, when scrolled into view. Ease-out cubic.
export function CountUp({
  to,
  duration = 1600,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  to: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started.current) {
            started.current = true
            const start = performance.now()
            const step = (now: number) => {
              const p = Math.min(1, (now - start) / duration)
              const eased = 1 - Math.pow(1 - p, 3)
              setValue(to * eased)
              if (p < 1) requestAnimationFrame(step)
              else setValue(to)
            }
            requestAnimationFrame(step)
            io.disconnect()
          }
        }
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [to, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatNumber(value, decimals)}
      {suffix}
    </span>
  )
}
