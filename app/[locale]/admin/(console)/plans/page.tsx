import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { getPlans } from '@/lib/admin/plans'
import { getFeatures, getPlanFeatureMatrix } from '@/lib/admin/entitlements'
import { PlanEditorCard, CreatePlanDialog } from '@/components/admin/plan-editor'
import { FeatureMatrix } from '@/components/admin/feature-matrix'

export default async function AdminPlansPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const ctx = await requirePlatformAdmin(locale)
  const t = await getTranslations('admin.plans')
  const [plans, features, matrix] = await Promise.all([
    getPlans(),
    getFeatures(),
    getPlanFeatureMatrix(),
  ])
  const canEdit = ctx.role === 'super'
  const activePlans = plans.filter((p) => p.is_active)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-400">{t('subtitle')}</p>
        </div>
        {canEdit && <CreatePlanDialog locale={locale} />}
      </div>

      {!canEdit && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          {t('readonly_notice')}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <PlanEditorCard key={p.key} plan={p} locale={locale} canEdit={canEdit} />
        ))}
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg font-semibold">
          {t('matrix_title')}
        </h2>
        <p className="mb-3 text-sm text-slate-400">{t('matrix_subtitle')}</p>
        <FeatureMatrix
          plans={activePlans}
          features={features}
          matrix={matrix}
          locale={locale}
          canEdit={canEdit}
        />
      </section>
    </div>
  )
}
