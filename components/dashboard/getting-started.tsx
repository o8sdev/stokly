import { getTranslations } from 'next-intl/server'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { WelcomeTour } from './welcome-tour'
import { dismissOnboarding } from '@/app/[locale]/app/(protected)/settings/actions'

// First-run welcome card, shown ABOVE the dashboard (it no longer replaces it).
// The how-it-works is an explanatory guided tour (WelcomeTour / driver.js) plus
// two quick-start shortcuts. Disappears once the core setup is done, or when the
// business explicitly dismisses it.
export async function GettingStarted({ locale }: { locale: string }) {
  const t = await getTranslations('onboarding')

  function Shortcut({ href, label }: { href: string; label: string }) {
    return (
      <Link
        href={href}
        className="group inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
      >
        {label}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {t('gs_kicker')}
        </span>
      </div>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
        {t('gs_title')}
      </h1>
      <p className="mt-1 text-muted-foreground">{t('gs_subtitle')}</p>

      {/* How it works — explanatory guided tour */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.05] p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t('tour.cta_title')}</p>
          <p className="text-xs text-muted-foreground">{t('tour.cta_desc')}</p>
        </div>
        <WelcomeTour />
      </div>

      {/* Quick-start shortcuts */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold">{t('gs_shortcuts')}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Shortcut href="/app/guide" label={t('guide_btn')} />
          <Shortcut href="/app/recipes/new" label={t('step3_btn')} />
          <Shortcut href="/app/inventory/count" label={t('step4_btn')} />
        </div>
      </div>

      {/* Escape hatch — businesses that don't use every step (e.g. no recipes)
          can hide this card for good. */}
      <form
        action={async () => {
          'use server'
          await dismissOnboarding(locale)
        }}
        className="mt-6 border-t border-border pt-4"
      >
        <button
          type="submit"
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
        >
          {t('dismiss')}
        </button>
      </form>
    </div>
  )
}
