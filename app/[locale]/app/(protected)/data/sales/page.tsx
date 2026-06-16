import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { resolveRange } from '@/lib/data/overview'
import { getSalesLog } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { SalesJournal } from '@/components/data/sales-journal'
import { EntryLinkButton } from '@/components/data/entry-link-button'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function SalesDataPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { from?: string; to?: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  // The journal's from/to inputs drive the query, so any specific day or range
  // works. First visit (no params) defaults to the current month.
  const def = resolveRange('this_month')
  const from = searchParams.from && DATE_RE.test(searchParams.from) ? searchParams.from : def.from
  const to = searchParams.to && DATE_RE.test(searchParams.to) ? searchParams.to : def.to
  const rows = await getSalesLog(ctx.tenantId, from, to)

  return (
    <div>
      <PageHeader
        title={t('data.sales_title')}
        description={t('data.sales_desc')}
        action={
          <EntryLinkButton href="/app/sales" label={t('data.add_sale')} />
        }
      />
      <SalesJournal rows={rows} from={from} to={to} />
    </div>
  )
}
