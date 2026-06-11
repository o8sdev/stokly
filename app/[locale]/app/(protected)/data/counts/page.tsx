import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { getCountRows } from '@/lib/data/counts'
import { PageHeader } from '@/components/layout/page-header'
import { CountsExplorer } from '@/components/data/counts-explorer'

export default async function CountsDataPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  // Counts are discrete events, not a rolling window — list them all and let the
  // explorer filter/sort/paginate.
  const rows = await getCountRows(ctx.tenantId)

  return (
    <div>
      <PageHeader
        title={t('data.counts_title')}
        description={t('data.counts_desc')}
      />
      <CountsExplorer rows={rows} />
    </div>
  )
}
