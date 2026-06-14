import { getTranslations } from 'next-intl/server'
import {
  ArrowRight,
  Sparkles,
  Check,
  Store,
  Truck,
  Carrot,
  ChefHat,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { WelcomeTour } from './welcome-tour'
import { dismissOnboarding } from '@/app/[locale]/app/(protected)/settings/actions'
import {
  getOnboardingState,
  ONBOARDING_STEP_HREF,
  type OnboardingStepKey,
} from '@/lib/data/onboarding'
import { cn } from '@/lib/utils'

// First-run welcome card, shown ABOVE the dashboard (it never replaces it). It
// mirrors the exact same step set as the /app/onboarding wizard — both derive
// from getOnboardingState — so the dashboard and the wizard never disagree about
// what's left to do. Disappears once setup is complete or is dismissed.
const STEP_META: Record<
  OnboardingStepKey,
  { icon: LucideIcon; helpKey: string }
> = {
  sales_points: { icon: Store, helpKey: 'sp_help' },
  suppliers: { icon: Truck, helpKey: 'sup_help' },
  ingredients: { icon: Carrot, helpKey: 'ing_help' },
  recipes: { icon: ChefHat, helpKey: 'rec_help' },
  stock: { icon: ClipboardList, helpKey: 'stock_help' },
}

export async function GettingStarted({
  locale,
  tenantId,
}: {
  locale: string
  tenantId: string
}) {
  const t = await getTranslations('onboarding')
  const { steps, doneCount, total } = await getOnboardingState(tenantId)
  const pct = Math.round((doneCount / total) * 100)

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

      {/* Progress */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{t('gs_progress', { done: doneCount, total })}</span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Step checklist — identical to the wizard's steps. */}
      <ol className="mt-5 space-y-2">
        {steps.map((s, i) => {
          const { icon: Icon, helpKey } = STEP_META[s.key]
          const inner = (
            <>
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  s.done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground'
                )}
              >
                {s.done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {t(`step_${s.key}`)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t(helpKey)}
                </span>
              </span>
              {!s.done && (
                <ArrowRight className="h-4 w-4 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              )}
            </>
          )
          return (
            <li key={s.key}>
              {s.done ? (
                <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                  {inner}
                </div>
              ) : (
                <Link
                  href={ONBOARDING_STEP_HREF[s.key]}
                  className="group flex items-start gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:bg-secondary"
                >
                  {inner}
                </Link>
              )}
            </li>
          )
        })}
      </ol>

      {/* Primary CTA — the guided wizard. */}
      <div className="mt-5">
        <Link
          href="/app/onboarding"
          className="group inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
        >
          {t('continue_setup')}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* How it works — explanatory guided tour */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.05] p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t('tour.cta_title')}</p>
          <p className="text-xs text-muted-foreground">{t('tour.cta_desc')}</p>
        </div>
        <WelcomeTour />
      </div>

      {/* Escape hatch — businesses that don't use every step can hide this. */}
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
