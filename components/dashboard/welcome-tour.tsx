'use client'

import { useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Compass } from 'lucide-react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

// Explanatory first-run walkthrough (driver.js). Centered, step-by-step popovers
// that explain how Stokly works — no "complete each step" checklist. Auto-runs
// once per business+browser (localStorage) and can be replayed from the button.
const STORAGE_PREFIX = 'stokly_onboarding_tour_v1'
const STEPS = [
  'welcome',
  'ingredients',
  'recipes',
  'count',
  'sales',
  'waste',
  'done',
] as const

export function WelcomeTour({
  autoStart = false,
  tenantId,
}: {
  autoStart?: boolean
  tenantId?: string
}) {
  const t = useTranslations('onboarding.tour')
  // Per-tenant key so the "already seen" flag doesn't leak between different
  // businesses that share a browser — each one gets its own first-run tour.
  const storageKey = tenantId
    ? `${STORAGE_PREFIX}_${tenantId}`
    : STORAGE_PREFIX

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
    if (!autoStart || typeof window === 'undefined') return
    if (localStorage.getItem(storageKey)) return
    // Defer so the page paints before the overlay drops. Mark "seen" only when
    // the tour actually fires — not before — so navigating away within the delay
    // doesn't permanently suppress a tour that never showed. StrictMode-safe:
    // the cleanup cancels the timer and the remount reschedules it, so it still
    // runs exactly once.
    const id = window.setTimeout(() => {
      localStorage.setItem(storageKey, '1')
      start()
    }, 500)
    return () => window.clearTimeout(id)
  }, [autoStart, start, storageKey])

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
