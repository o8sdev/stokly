import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { listAuditLogs } from '@/lib/admin/queries'
import { Pagination } from '@/components/ui/pagination'
import { AuditLogTable } from '@/components/admin/audit-log-table'

type SP = Record<string, string | string[] | undefined>
const str = (v: string | string[] | undefined): string | undefined =>
  typeof v === 'string' ? v : undefined

export default async function AdminLogsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: SP
}) {
  setRequestLocale(locale)
  await requirePlatformAdmin(locale)
  const t = await getTranslations('admin.logs')

  const { rows, total, page, pageCount } = await listAuditLogs({
    action: str(searchParams.action),
    actor: str(searchParams.actor),
    tenant: str(searchParams.tenant),
    from: str(searchParams.from),
    to: str(searchParams.to),
    page: Number(str(searchParams.page)) || 1,
  })

  function hrefForPage(p: number): string {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === 'string') sp.set(k, v)
    }
    sp.set('page', String(p))
    return `/admin/logs?${sp.toString()}`
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
      <AuditLogTable rows={rows} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{t('total', { total })}</p>
        <Pagination page={page} pageCount={pageCount} hrefForPage={hrefForPage} />
      </div>
    </div>
  )
}
