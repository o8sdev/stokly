'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

// Scroll-reveal wrapper. Adds the .mk-reveal class and flips data-shown the
// first time the element enters the viewport (CSS handles the transition).
// `delay` staggers grouped reveals. Respects prefers-reduced-motion via CSS.
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            io.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn('mk-reveal', className)}
      data-shown={shown}
      style={{ '--mk-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}
