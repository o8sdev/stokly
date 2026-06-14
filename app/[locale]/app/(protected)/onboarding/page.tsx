import { setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { getOnboardingState } from '@/lib/data/onboarding'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

// First-run guided setup. Resumable — every step's "done" state is derived from
// real data, so leaving and returning never loses progress. Steps come from the
// same getOnboardingState helper the dashboard card uses, so they never drift.
export default async function OnboardingPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const ctx = await requireTenant(locale)
  const s = await getOnboardingState(ctx.tenantId)

  return (
    <OnboardingWizard
      locale={locale}
      suppliers={s.suppliers}
      ingredients={s.ingredients}
      salesPoints={s.salesPoints}
      warehouseName={s.warehouseName}
      recipeNames={s.recipeNames}
      hasStock={s.hasStock}
    />
  )
}
