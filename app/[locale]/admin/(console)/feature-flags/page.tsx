import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { getFeatures, getTenantOverrides } from '@/lib/admin/entitlements'
import { FeatureFlagsClient } from '@/components/admin/feature-flags-client'

export default async function AdminFeatureFlagsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const ctx = await requirePlatformAdmin(locale)
  const t = await getTranslations('admin.flags')
  const supabase = createClient()

  const [features, overrides, tenantsRes] = await Promise.all([
    getFeatures(),
    getTenantOverrides(),
    supabase
      .from('tenants')
      .select('id, name')
      .neq('status', 'deleted')
      .order('name', { ascending: true })
      .limit(500),
  ])

  const canEdit = ctx.role === 'super'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-sm text-slate-400">{t('subtitle')}</p>
      </div>

      {!canEdit && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          {t('readonly_notice')}
        </p>
      )}

      <FeatureFlagsClient
        features={features}
        overrides={overrides}
        tenants={tenantsRes.data ?? []}
        locale={locale}
        canEdit={canEdit}
      />
    </div>
  )
}
