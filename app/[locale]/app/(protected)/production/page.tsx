import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Plus } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import { getProductionRuns } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { ProductionRunsList } from '@/components/production/production-runs-list'

export default async function ProductionPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)
  const runs = await getProductionRuns(ctx.tenantId)

  return (
    <div>
      <PageHeader
        title={t('production.title')}
        description={t('production.subtitle')}
        action={
          <Button asChild className="gap-2">
            <Link href="/app/production/new">
              <Plus className="h-4 w-4" />
              {t('production.new')}
            </Link>
          </Button>
        }
      />
      <ProductionRunsList locale={locale} runs={runs} />
    </div>
  )
}
