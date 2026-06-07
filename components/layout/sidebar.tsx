'use client'

import { useTranslations } from 'next-intl'
import { LogOut } from 'lucide-react'
import { usePathname, Link } from '@/lib/i18n/navigation'
import { NAV_SECTIONS } from './nav-items'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/database'

// Pick the single best-matching nav href for the current path (longest prefix),
// so /settings/suppliers highlights "Suppliers" and not "Settings".
function useActiveHref(pathname: string): string {
  const hrefs = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href))
  let best = ''
  for (const href of hrefs) {
    const matches =
      href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
    if (matches && href.length > best.length) best = href
  }
  // Fallback so the root never wins over a deeper match.
  if (!best && pathname === '/') best = '/'
  return best
}

export function Sidebar({
  email,
  role,
  roleLabel,
  onSignout,
}: {
  email: string | null
  role: Role
  roleLabel: string
  onSignout: () => Promise<void>
}) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const activeHref = useActiveHref(pathname)

  const initial = (email ?? 'S').charAt(0).toUpperCase()

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar md:flex">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-6">
        <span className="h-2 w-2 rounded-full bg-brand" />
        <span className="text-[20px] font-semibold tracking-tight text-brand">
          Stokly
        </span>
      </div>

      {/* Sections */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scroll-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.labelKey} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.1em] text-sidebar-muted">
              {t(`section.${section.labelKey}`)}
            </p>
            {section.items.map((item) => {
              const active = item.href === activeHref
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex h-9 items-center gap-2.5 rounded-md border-l-2 border-transparent px-3 text-sm font-medium transition-all duration-150 ease-out',
                    active
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
      </nav>

      {/* User footer */}
      <div className="flex items-center gap-3 border-t border-white/5 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20 text-sm font-semibold text-brand">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white">
            {email ?? '—'}
          </p>
          <p className="text-[11px] capitalize text-sidebar-muted">
            {roleLabel}
          </p>
        </div>
        <form action={onSignout}>
          <button
            type="submit"
            title={t('signout')}
            className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  )
}
