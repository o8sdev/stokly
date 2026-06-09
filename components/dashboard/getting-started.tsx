import { getTranslations } from 'next-intl/server'
import { Check, ArrowRight, Sparkles } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/utils'
import { BusinessTypeChooser } from './business-type-chooser'
import { QuickAdd } from '@/components/ingredients/quick-add'
import type { GlobalIngredient } from '@/types/database'

export interface OnboardingSteps {
  businessType: boolean
  ingredients: boolean
  recipes: boolean
  count: boolean
}

// First-run "getting started" checklist on the dashboard. Each step shows its
// state (done = green check) + an explanation + the action to take. Disappears
// once the four core steps are done.
export async function GettingStarted({
  locale,
  steps,
  businessType,
  commonItems = [],
}: {
  locale: string
  steps: OnboardingSteps
  businessType: string | null
  commonItems?: GlobalIngredient[]
}) {
  const t = await getTranslations('onboarding')
  const flags = [steps.businessType, steps.ingredients, steps.recipes, steps.count]
  const done = flags.filter(Boolean).length
  const current = flags.indexOf(false) // first incomplete step (−1 if all done)

  function Badge({ i, isDone }: { i: number; isDone: boolean }) {
    return (
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          isDone
            ? 'bg-green-100 text-green-700'
            : i === current
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground'
        )}
      >
        {isDone ? <Check className="h-4 w-4" /> : i + 1}
      </span>
    )
  }

  function ActionLink({
    href,
    label,
    primary,
  }: {
    href: string
    label: string
    primary?: boolean
  }) {
    return (
      <Link
        href={href}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
          primary
            ? 'bg-primary text-primary-foreground hover:opacity-90'
            : 'border border-border text-foreground hover:bg-secondary'
        )}
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
          {t('gs_progress', { done, total: 4 })}
        </span>
      </div>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
        {t('gs_title')}
      </h1>
      <p className="mt-1 text-muted-foreground">{t('gs_subtitle')}</p>

      <ol className="mt-7 space-y-7">
        {/* 1 — business type */}
        <li className="flex gap-4">
          <Badge i={0} isDone={steps.businessType} />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{t('step1_title')}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t('step1_desc')}
            </p>
            <div className="mt-3">
              <BusinessTypeChooser locale={locale} current={businessType} />
            </div>
          </div>
        </li>

        {/* 2 — ingredients */}
        <li className="flex gap-4">
          <Badge i={1} isDone={steps.ingredients} />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{t('step2_title')}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t('step2_desc')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionLink href="/app/ingredients/import" label={t('import_btn')} primary />
              <ActionLink href="/app/ingredients/library" label={t('library_btn')} />
              <ActionLink href="/app/ingredients/new" label={t('manual_btn')} />
            </div>
            {!steps.ingredients && commonItems.length > 0 && (
              <div className="mt-4">
                <QuickAdd locale={locale} items={commonItems} />
              </div>
            )}
          </div>
        </li>

        {/* 3 — recipes */}
        <li className="flex gap-4">
          <Badge i={2} isDone={steps.recipes} />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{t('step3_title')}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t('step3_desc')}
            </p>
            <div className="mt-3">
              <ActionLink href="/app/recipes/new" label={t('step3_btn')} />
            </div>
          </div>
        </li>

        {/* 4 — initial count */}
        <li className="flex gap-4">
          <Badge i={3} isDone={steps.count} />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{t('step4_title')}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t('step4_desc')}
            </p>
            <div className="mt-3">
              <ActionLink href="/app/inventory/count" label={t('step4_btn')} />
            </div>
          </div>
        </li>

        {/* 5 — ongoing daily logging */}
        <li className="flex gap-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
            5
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{t('step5_title')}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t('step5_desc')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionLink href="/app/sales" label={t('step5_sales')} />
              <ActionLink href="/app/inventory/waste" label={t('step5_waste')} />
            </div>
          </div>
        </li>
      </ol>
    </div>
  )
}
