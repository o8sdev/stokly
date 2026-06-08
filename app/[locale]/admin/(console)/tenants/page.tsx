import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { enterTenant } from './actions'
import { formatDate } from '@/lib/utils'

export default async function AdminTenantsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations('admin')
  const supabase = createClient()

  const { data } = await supabase
    .from('tenants')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false })
  const tenants = data ?? []

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t('tenants.title')}</h1>
      <p className="mt-1 text-sm text-slate-400">{t('tenants.subtitle')}</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        {tenants.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">
            {t('tenants.empty')}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 text-left font-semibold">
                  {t('tenants.col_name')}
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  {t('tenants.col_created')}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="border-b border-white/[0.06] last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{tenant.name}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(tenant.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={enterTenant.bind(null, locale, tenant.id)}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-[#04231A] transition-colors hover:bg-brand-hover"
                      >
                        {t('tenants.enter')}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </form>
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
