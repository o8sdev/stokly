'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Compass } from 'lucide-react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

// Explanatory walkthrough (driver.js), launched on demand from the button.
//
// IMPORTANT: it is NOT auto-started. The steps have no target element, so while
// a tour is active driver.js applies `pointer-events: none` to the whole page
// (only the popover stays clickable). Auto-running it on the dashboard — and
// worse, leaving it active across a soft navigation — froze the UI: the sidebar
// tabs became unclickable. Now it runs only on an explicit click, the instance
// is destroyed on unmount, and any overlay/class an interrupted tour left behind
// is swept on mount, so the page can never stay frozen.
const STEPS = [
  'welcome',
  'ingredients',
  'recipes',
  'count',
  'sales',
  'waste',
  'done',
] as const

// Remove any driver.js leftovers (overlay element + the body/html `driver-active`
// class) that a tour interrupted mid-flight may have left, which would otherwise
// keep `pointer-events: none` on the entire page.
function sweepDriverArtifacts() {
  if (typeof document === 'undefined') return
  document.documentElement.classList.remove('driver-active', 'driver-fade')
  document.body.classList.remove('driver-active', 'driver-fade')
  document
    .querySelectorAll('.driver-overlay, .driver-popover')
    .forEach((el) => el.remove())
}

export function WelcomeTour() {
  const t = useTranslations('onboarding.tour')
  const driverRef = useRef<ReturnType<typeof driver> | null>(null)

  const start = useCallback(() => {
    driverRef.current?.destroy()
    const d = driver({
      showProgress: true,
      allowClose: true,
      overlayColor: '#0d1b2a',
      overlayOpacity: 0.6,
      nextBtnText: t('next'),
      prevBtnText: t('prev'),
      doneBtnText: t('done'),
      progressText: '{{current}} / {{total}}',
      popoverClass: 'stokly-tour',
      steps: STEPS.map((k) => ({
        popover: {
          title: t(`${k}_title`),
          description: t(`${k}_desc`),
        },
      })),
    })
    driverRef.current = d
    d.drive()
  }, [t])

  useEffect(() => {
    sweepDriverArtifacts()
    return () => {
      driverRef.current?.destroy()
      sweepDriverArtifacts()
    }
  }, [])

  return (
    <button
      type="button"
      onClick={start}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
    >
      <Compass className="h-4 w-4" />
      {t('start')}
    </button>
  )
}
