import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { resolveRange } from '@/lib/data/overview'
import { getPurchaseLog } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { EntryLinkButton } from '@/components/data/entry-link-button'
import { PurchasesJournal } from '@/components/data/purchases-journal'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function PurchasesDataPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { from?: string; to?: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  // The journal's from/to inputs drive the query — any specific day or range
  // works. First visit (no params) defaults to the current month.
  const def = resolveRange('this_month')
  const from = searchParams.from && DATE_RE.test(searchParams.from) ? searchParams.from : def.from
  const to = searchParams.to && DATE_RE.test(searchParams.to) ? searchParams.to : def.to
  const rows = await getPurchaseLog(ctx.tenantId, from, to)

  return (
    <div>
      <PageHeader
        title={t('data.purchases_title')}
        description={t('data.purchases_desc')}
        action={
          <EntryLinkButton href="/app/purchases" label={t('data.add_purchase')} />
        }
      />
      <PurchasesJournal rows={rows} from={from} to={to} />
    </div>
  )
}
