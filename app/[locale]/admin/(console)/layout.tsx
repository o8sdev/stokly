import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LogOut } from 'lucide-react'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { signout } from '@/lib/auth/actions'
import { AdminNav } from '@/components/admin/admin-nav'

export default async function AdminConsoleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const ctx = await requirePlatformAdmin(locale)
  const t = await getTranslations('admin')

  async function handleSignout() {
    'use server'
    await signout(locale, `/${locale}/admin/login`)
  }

  return (
    <div className="min-h-screen bg-[#0d1b2a] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand" />
              <span className="font-display text-lg font-bold">Stokly</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                admin
              </span>
            </span>
            <AdminNav />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:inline">
              {ctx.email}
            </span>
            <form action={handleSignout}>
              <button
                type="submit"
                title={t('signout')}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  )
}
