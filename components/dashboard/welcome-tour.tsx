'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Compass } from 'lucide-react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

// Explanatory first-run walkthrough (driver.js). Centered, step-by-step popovers
// that explain how Stokly works — no "complete each step" checklist. Auto-runs
// once per browser (localStorage) and can be replayed from the button.
const STORAGE_KEY = 'stokly_onboarding_tour_v1'
const STEPS = [
  'welcome',
  'ingredients',
  'recipes',
  'count',
  'sales',
  'waste',
  'done',
] as const

export function WelcomeTour({ autoStart = false }: { autoStart?: boolean }) {
  const t = useTranslations('onboarding.tour')
  const startedRef = useRef(false)

  const start = useCallback(() => {
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
    d.drive()
  }, [t])

  useEffect(() => {
    if (!autoStart || startedRef.current || typeof window === 'undefined') return
    if (localStorage.getItem(STORAGE_KEY)) return
    startedRef.current = true
    localStorage.setItem(STORAGE_KEY, '1')
    // Let the page paint before the overlay drops.
    const id = window.setTimeout(start, 500)
    return () => window.clearTimeout(id)
  }, [autoStart, start])

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
