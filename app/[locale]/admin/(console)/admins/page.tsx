import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireSuperAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { AdminsManager } from './admins-manager'

// Platform-admin account management. Super-only (the guard redirects readonly
// admins to the console home).
export default async function AdminsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations('admin.admins')
  const ctx = await requireSuperAdmin(locale)
  const supabase = createClient()
  const { data } = await supabase.rpc('admin_list_platform_admins')

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-sm text-slate-400">{t('subtitle')}</p>
      <div className="mt-6">
        <AdminsManager locale={locale} admins={data ?? []} selfId={ctx.userId} />
      </div>
    </div>
  )
}
