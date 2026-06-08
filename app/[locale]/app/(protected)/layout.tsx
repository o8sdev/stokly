import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { getTenant } from '@/lib/data/queries'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { ImpersonationBanner } from '@/components/layout/impersonation-banner'
import { signout, exitImpersonation } from '@/lib/auth/actions'

export default async function BusinessLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  setRequestLocale(locale)
  // Auth + active tenant. For a system admin this resolves to the tenant they
  // are impersonating (god-mode); otherwise their own tenant.
  const ctx = await requireTenant(locale)
  const t = await getTranslations('role')

  // When an admin is impersonating, show which restaurant they're viewing.
  const impersonatedName = ctx.isAdmin
    ? (await getTenant(ctx.tenantId))?.name ?? '—'
    : null

  async function handleSignout() {
    'use server'
    await signout(locale, `/${locale}/app/login`)
  }

  async function handleExit() {
    'use server'
    await exitImpersonation(locale)
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
        {impersonatedName && (
          <ImpersonationBanner
            tenantName={impersonatedName}
            onExit={handleExit}
          />
        )}
        <Header email={ctx.email} locale={locale} onSignout={handleSignout} />
        <main className="flex-1 overflow-y-auto scroll-thin p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
