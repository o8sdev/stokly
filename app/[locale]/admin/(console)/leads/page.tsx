import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { StatusSelect } from '@/components/admin/status-select'
import type { DemoRequest, DemoRequestStatus } from '@/types/database'
import { formatDate } from '@/lib/utils'

export default async function AdminLeadsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations('admin')
  const supabase = createClient()

  const { data } = await supabase
    .from('demo_requests')
    .select('*')
    .order('created_at', { ascending: false })
  const leads = (data ?? []) as DemoRequest[]

  const statusLabels: Record<DemoRequestStatus, string> = {
    new: t('status.new'),
    contacted: t('status.contacted'),
    sent: t('status.sent'),
    closed: t('status.closed'),
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t('leads.title')}</h1>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        {leads.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">
            {t('leads.empty')}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 text-left font-semibold">
                  {t('leads.col_date')}
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  {t('leads.col_name')}
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  {t('leads.col_restaurant')}
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  {t('leads.col_email')}
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  {t('leads.col_message')}
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  {t('leads.col_status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-white/[0.06] last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                    {formatDate(lead.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium">{lead.name}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {lead.restaurant_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-brand hover:underline"
                    >
                      {lead.email}
                    </a>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-400">
                    <span className="line-clamp-2">{lead.message ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect
                      locale={locale}
                      id={lead.id}
                      status={lead.status}
                      labels={statusLabels}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
