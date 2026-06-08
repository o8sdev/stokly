'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * App-wide navigation feedback for client-side route changes.
 *
 * App Router doesn't expose router events, so we detect the *start* of a
 * navigation from same-origin link clicks + programmatic history changes, and
 * detect *completion* when the resolved pathname / query string actually
 * changes. Renders a thin teal progress bar at the top plus a small corner
 * spinner so the user always gets instant, smooth feedback that something is
 * loading — the route-level skeletons (loading.tsx) fill in the page itself.
 *
 * Must be mounted inside a <Suspense> boundary because it reads
 * useSearchParams().
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  const active = useRef(false)
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const failsafe = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopTimers = useCallback(() => {
    if (trickle.current) clearInterval(trickle.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (resetTimer.current) clearTimeout(resetTimer.current)
    if (failsafe.current) clearTimeout(failsafe.current)
    trickle.current = null
    hideTimer.current = null
    resetTimer.current = null
    failsafe.current = null
  }, [])

  const finish = useCallback(() => {
    if (!active.current) return
    active.current = false
    stopTimers()
    setProgress(100)
    hideTimer.current = setTimeout(() => {
      setVisible(false)
      resetTimer.current = setTimeout(() => setProgress(0), 250)
    }, 280)
  }, [stopTimers])

  const start = useCallback(() => {
    if (active.current) return
    active.current = true
    stopTimers()
    setVisible(true)
    setProgress(10)
    // Trickle toward 90% — fast at first, easing as it approaches the cap so it
    // never visually "completes" before the real navigation does.
    trickle.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p
        const step = p < 35 ? 9 : p < 60 ? 5 : p < 80 ? 2 : 0.6
        return Math.min(90, p + step)
      })
    }, 240)
    // Safety net: if a navigation is triggered but the URL never resolves to a
    // change (e.g. push to the current route), don't leave the bar stuck.
    failsafe.current = setTimeout(() => finish(), 10000)
  }, [stopTimers, finish])

  // Navigation committed → the URL changed → finish the bar.
  useEffect(() => {
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  useEffect(() => () => stopTimers(), [stopTimers])

  // Begin the bar the moment a navigation is triggered.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Ignore modified clicks / non-primary buttons (new tab, etc.).
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return
      }
      const anchor = (e.target as Element | null)?.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (href === null) return
      const target = anchor.getAttribute('target')
      if (target && target !== '_self') return
      if (anchor.hasAttribute('download')) return
      if (/^(mailto:|tel:|sms:|#)/.test(href)) return

      let dest: URL
      try {
        dest = new URL(href, window.location.href)
      } catch {
        return
      }
      if (dest.origin !== window.location.origin) return
      // Same page (incl. hash-only changes) → not a navigation.
      if (
        dest.pathname === window.location.pathname &&
        dest.search === window.location.search
      ) {
        return
      }
      start()
    }

    document.addEventListener('click', onClick)

    // router.push/replace and prefetch-driven navigations go through the
    // History API — patch it so programmatic navigation also lights the bar.
    const origPush = window.history.pushState
    window.history.pushState = function (
      this: History,
      ...args: Parameters<History['pushState']>
    ): void {
      start()
      return origPush.apply(this, args)
    }
    function onPop() {
      start()
    }
    window.addEventListener('popstate', onPop)

    return () => {
      document.removeEventListener('click', onClick)
      window.history.pushState = origPush
      window.removeEventListener('popstate', onPop)
    }
  }, [start])

  if (!visible) return null

  const fading = progress >= 100

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-[3px]"
      >
        <div
          className="h-full rounded-r-full bg-brand"
          style={{
            width: `${progress}%`,
            opacity: fading ? 0 : 1,
            boxShadow:
              '0 0 10px rgba(0,200,150,0.7), 0 0 5px rgba(0,200,150,0.55)',
            transition: 'width 220ms ease-out, opacity 280ms ease 140ms',
          }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none fixed right-4 top-3.5 z-[120]"
        style={{ opacity: fading ? 0 : 1, transition: 'opacity 200ms ease' }}
      >
        <span className="block h-5 w-5 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
      </div>
    </>
  )
}
