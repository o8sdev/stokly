import { getTranslations } from 'next-intl/server'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { BusinessTypeChooser } from './business-type-chooser'
import { WelcomeTour } from './welcome-tour'
import { QuickAdd } from '@/components/ingredients/quick-add'
import { dismissOnboarding } from '@/app/[locale]/app/(protected)/settings/actions'
import type { GlobalIngredient } from '@/types/database'

// First-run welcome card. The how-it-works is an explanatory guided tour
// (WelcomeTour / driver.js) rather than a manual "complete each step" checklist.
// The business-type chooser stays (it's a real choice that drives the library),
// plus quick-start shortcuts. Disappears once the core setup is done, or when
// the business explicitly dismisses it.
export async function GettingStarted({
  locale,
  tenantId,
  businessType,
  commonItems = [],
}: {
  locale: string
  tenantId: string
  businessType: string | null
  commonItems?: GlobalIngredient[]
}) {
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

      {/* How it works — explanatory guided tour (auto-runs once) */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.05] p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t('tour.cta_title')}</p>
          <p className="text-xs text-muted-foreground">{t('tour.cta_desc')}</p>
        </div>
        <WelcomeTour autoStart tenantId={tenantId} />
      </div>

      {/* Business type — a real choice that tailors the ingredient library */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold">{t('step1_title')}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{t('step1_desc')}</p>
        <div className="mt-3">
          <BusinessTypeChooser locale={locale} current={businessType} />
        </div>
      </div>

      {/* Quick-start shortcuts */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold">{t('gs_shortcuts')}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Shortcut href="/app/ingredients/import" label={t('import_btn')} />
          <Shortcut href="/app/ingredients/library" label={t('library_btn')} />
          <Shortcut href="/app/recipes/new" label={t('step3_btn')} />
          <Shortcut href="/app/inventory/count" label={t('step4_btn')} />
        </div>
      </div>

      {commonItems.length > 0 && (
        <div className="mt-6">
          <QuickAdd locale={locale} items={commonItems} />
        </div>
      )}

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
