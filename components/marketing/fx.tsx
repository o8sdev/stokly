'use client'

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { cn } from '@/lib/utils'
import { CountUp } from './count-up'

// Thin top progress bar that tracks page scroll.
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const update = () => {
      const el = ref.current
      if (!el) return
      const doc = document.documentElement
      const max = doc.scrollHeight - doc.clientHeight
      const p = max > 0 ? doc.scrollTop / max : 0
      el.style.transform = `scaleX(${p})`
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return <div ref={ref} className="mk-progress" aria-hidden />
}

// Pointer-following wrapper for CTAs (the button drifts toward the cursor and
// eases back on leave).
export function Magnetic({
  children,
  className,
  strength = 0.35,
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = e.clientX - (r.left + r.width / 2)
    const y = e.clientY - (r.top + r.height / 2)
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`
  }
  function reset() {
    const el = ref.current
    if (el) el.style.transform = 'translate(0px, 0px)'
  }
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={cn('inline-flex transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]', className)}
      style={{ willChange: 'transform' }}
    >
      {children}
    </div>
  )
}

// 3D pointer-tilt for the hero product frame.
export function HeroTilt({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    const el = outer.current
    const card = inner.current
    if (!el || !card) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    card.style.transform = `rotateY(${px * 6}deg) rotateX(${-py * 6}deg)`
  }
  function reset() {
    const card = inner.current
    if (card) card.style.transform = 'rotateY(0deg) rotateX(0deg)'
  }
  return (
    <div
      ref={outer}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={className}
      style={{ perspective: '1500px' }}
    >
      <div
        ref={inner}
        className="transition-transform duration-500 ease-out [transform-style:preserve-3d]"
        style={{ willChange: 'transform' }}
      >
        {children}
      </div>
    </div>
  )
}

// Radial gauge that fills when scrolled into view, with a counting centre value.
export function Gauge({
  value = 28.4,
  label,
}: {
  value?: number
  label: string
}) {
  const ref = useRef<SVGCircleElement>(null)
  const [on, setOn] = useState(false)
  const r = 52
  const c = 2 * Math.PI * r
  const pct = Math.min(Math.max(value, 0), 100) / 100

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setOn(true)
            io.disconnect()
          }
        }
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="relative grid h-[132px] w-[132px] place-items-center">
      <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        <circle
          ref={ref}
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="url(#mk-gauge)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={on ? c * (1 - pct) : c}
          style={{
            transition: 'stroke-dashoffset 1.7s cubic-bezier(0.16,1,0.3,1)',
            filter: 'drop-shadow(0 0 6px rgba(0,200,150,0.55))',
          }}
        />
        <defs>
          <linearGradient id="mk-gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00c896" />
            <stop offset="100%" stopColor="#5ff5cb" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-mono text-2xl font-semibold text-white">
            <CountUp to={value} decimals={1} suffix="%" />
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[#9fb2aa]">
            {label}
          </div>
        </div>
      </div>
    </div>
  )
}
