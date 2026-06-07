import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { signout } from '../(auth)/actions'

export default async function DashboardLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  setRequestLocale(locale)
  // Enforces auth + resolves tenant. Redirects to /login if missing.
  const ctx = await requireTenant(locale)
  const t = await getTranslations('role')

  async function handleSignout() {
    'use server'
    await signout(locale)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        email={ctx.email}
        role={ctx.role}
        roleLabel={t(ctx.role)}
        onSignout={handleSignout}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header email={ctx.email} locale={locale} onSignout={handleSignout} />
        <main className="flex-1 overflow-y-auto scroll-thin p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
