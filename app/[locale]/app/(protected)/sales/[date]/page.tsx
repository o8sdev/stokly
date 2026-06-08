import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { DailySalesForm } from '@/components/sales/daily-sales-form'
import { Link } from '@/lib/i18n/navigation'
import { formatDate } from '@/lib/utils'
import type { DailySale } from '@/types/database'

export default async function SalesDatePage({
  params: { locale, date },
}: {
  params: { locale: string; date: string }
}) {
  setRequestLocale(locale)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const supabase = createClient()
  const { data } = await supabase
    .from('daily_sales')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('sale_date', date)
    .maybeSingle()
  const existing = data as DailySale | null

  return (
    <div>
      <PageHeader title={`${t('sales.title')} — ${formatDate(date)}`} />
      <Link
        href="/app/sales"
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        ← {t('sales.title')}
      </Link>
      <div className="max-w-lg">
        <DailySalesForm
          locale={locale}
          date={date}
          amount={existing?.total_amount}
          note={existing?.note}
          lockDate
        />
      </div>
    </div>
  )
}
