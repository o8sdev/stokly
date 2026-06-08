import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Inbox, Store, Plus } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminHome({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations('admin')
  const supabase = createClient()

  const [{ count: newLeads }, { count: totalLeads }, { count: tenants }] =
    await Promise.all([
      supabase
        .from('demo_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new'),
      supabase
        .from('demo_requests')
        .select('*', { count: 'exact', head: true }),
      supabase.from('tenants').select('*', { count: 'exact', head: true }),
    ])

  const cards = [
    {
      href: '/admin/leads',
      label: t('home.new_leads'),
      value: newLeads ?? 0,
      icon: Inbox,
    },
    {
      href: '/admin/leads',
      label: t('home.total_leads'),
      value: totalLeads ?? 0,
      icon: Inbox,
    },
    {
      href: '/admin/tenants',
      label: t('home.tenants'),
      value: tenants ?? 0,
      icon: Store,
    },
  ]

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t('home.title')}</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c, i) => {
          const Icon = c.icon
          return (
            <Link
              key={i}
              href={c.href}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-brand/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{c.label}</span>
                <Icon className="h-4 w-4 text-slate-500" />
              </div>
              <div className="mt-3 font-mono text-4xl font-medium tabular-nums">
                {c.value}
              </div>
            </Link>
          )
        })}
      </div>

      <Link
        href="/admin/businesses/new"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-[#04231A] transition-colors hover:bg-brand-hover"
      >
        <Plus className="h-4 w-4" />
        {t('nav.new_business')}
      </Link>
    </div>
  )
}
