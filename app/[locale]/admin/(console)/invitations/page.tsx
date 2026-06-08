import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { listInvitations } from '@/lib/admin/queries'
import { getPlans } from '@/lib/admin/plans'
import { Pagination } from '@/components/ui/pagination'
import { InvitationsClient } from '@/components/admin/invitations-client'

type SP = Record<string, string | string[] | undefined>
const str = (v: string | string[] | undefined): string | undefined =>
  typeof v === 'string' ? v : undefined

export default async function AdminInvitationsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: SP
}) {
  setRequestLocale(locale)
  await requirePlatformAdmin(locale)
  const t = await getTranslations('admin.invitations')

  const [{ rows, total, page, pageCount }, plans] = await Promise.all([
    listInvitations({
      search: str(searchParams.search),
      status: str(searchParams.status),
      plan: str(searchParams.plan),
      page: Number(str(searchParams.page)) || 1,
    }),
    getPlans(),
  ])

  function hrefForPage(p: number): string {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === 'string') sp.set(k, v)
    }
    sp.set('page', String(p))
    return `/admin/invitations?${sp.toString()}`
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
      <InvitationsClient rows={rows} plans={plans} locale={locale} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{t('total', { total })}</p>
        <Pagination page={page} pageCount={pageCount} hrefForPage={hrefForPage} />
      </div>
    </div>
  )
}
