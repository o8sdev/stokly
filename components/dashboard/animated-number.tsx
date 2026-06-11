'use client'

import { useEffect, useRef, useState } from 'react'

// Deterministic en-US-style formatting (NOT toLocaleString) so server and
// client render byte-identical text — ICU data differs between Node and the
// browser, which causes hydration mismatches.
function fmt(n: number, decimals: number): string {
  const fixed = n.toFixed(decimals)
  const [intPart, decPart] = fixed.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart != null ? `${grouped}.${decPart}` : grouped
}

// Dashboard KPI count-up: rises from 0 to `to` once on mount (ease-out cubic).
// Respects prefers-reduced-motion by jumping straight to the final value.
export function AnimatedNumber({
  to,
  decimals = 2,
  duration = 900,
}: {
  to: number
  decimals?: number
  duration?: number
}) {
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(to)
      return
    }
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(to * eased)
      if (p < 1) raf = requestAnimationFrame(step)
      else setValue(to)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])

  return <span className="tabular-nums">{fmt(value, decimals)}</span>
}
