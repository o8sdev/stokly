'use client'

import { useTranslations } from 'next-intl'
import { usePathname, Link } from '@/lib/i18n/navigation'
import { ADMIN_NAV_SECTIONS, ADMIN_NAV_HREFS } from './admin-nav-items'
import { cn } from '@/lib/utils'
import { StoklyLogo } from '@/components/brand/logo'
import { SignOutButton } from '@/components/layout/sign-out'

// Longest-prefix match so /admin/tenants/123 highlights "Tenants", and the bare
// /admin only matches the Dashboard item.
export function activeAdminHref(pathname: string): string {
  let best = ''
  for (const href of ADMIN_NAV_HREFS) {
    const matches =
      pathname === href || pathname.startsWith(href + '/')
    if (matches && href.length > best.length) best = href
  }
  return best
}

export function AdminNavLinks({
  onNavigate,
}: {
  onNavigate?: () => void
}) {
  const t = useTranslations('admin.nav')
  const pathname = usePathname()
  const active = activeAdminHref(pathname)

  return (
    <>
      {ADMIN_NAV_SECTIONS.map((section) => (
        <div key={section.labelKey} className="space-y-1">
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.1em] text-sidebar-muted">
            {t(`section.${section.labelKey}`)}
          </p>
          {section.items.map((item) => {
            const isActive = item.href === active
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'group flex h-9 items-center gap-2.5 rounded-md border-l-2 border-transparent px-3 text-sm font-medium transition-all duration-150 ease-out',
                  isActive
                    ? 'border-brand bg-[rgba(0,200,150,0.1)] text-brand'
                    : 'text-sidebar-foreground hover:bg-[rgba(255,255,255,0.06)] hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t(item.labelKey)}
              </Link>
            )
          })}
        </div>
      ))}
    </>
  )
}

export function AdminSidebar({
  email,
  roleLabel,
  onSignout,
}: {
  email: string | null
  roleLabel: string
  onSignout: () => Promise<void>
}) {
  const t = useTranslations('admin')
  const initial = (email ?? 'A').charAt(0).toUpperCase()

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar md:flex">
      <div className="flex h-14 items-center gap-2 px-6">
        <StoklyLogo tone="brand" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          admin
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scroll-thin">
        <AdminNavLinks />
      </nav>

      <div className="flex items-center gap-3 border-t border-white/5 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20 text-sm font-semibold text-brand">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white">
            {email ?? '—'}
          </p>
          <p className="text-[11px] capitalize text-sidebar-muted">{roleLabel}</p>
        </div>
        <SignOutButton
          action={onSignout}
          label={t('signout')}
          variant="admin"
          className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60"
        />
      </div>
    </aside>
  )
}
