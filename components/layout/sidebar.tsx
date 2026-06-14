'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { usePathname, Link } from '@/lib/i18n/navigation'
import { NAV_SECTIONS, isNavGroup, type NavItem } from './nav-items'
import { cn } from '@/lib/utils'
import { StoklyLogo } from '@/components/brand/logo'
import { SignOutButton } from './sign-out'
import type { Role } from '@/types/database'

// Pick the single best-matching nav href for the current path (longest prefix),
// so /settings/suppliers highlights "Suppliers" and not "Settings". Considers
// child links inside collapsible groups too.
function useActiveHref(pathname: string): string {
  const hrefs = NAV_SECTIONS.flatMap((s) =>
    s.items.flatMap((i) => (isNavGroup(i) ? i.children.map((c) => c.href) : [i.href]))
  )
  let best = ''
  for (const href of hrefs) {
    const matches =
      href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
    if (matches && href.length > best.length) best = href
  }
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
  const [open, setOpen] = useState<Set<string>>(new Set())

  function toggleGroup(key: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const initial = (email ?? 'S').charAt(0).toUpperCase()

  const leafClass = (active: boolean) =>
    cn(
      'group flex h-9 items-center gap-2.5 rounded-md border-l-2 border-transparent px-3 text-sm font-medium transition-all duration-150 ease-out',
      active
        ? 'border-brand bg-[rgba(0,200,150,0.1)] text-brand'
        : 'text-sidebar-foreground hover:bg-[rgba(255,255,255,0.06)] hover:text-white'
    )

  function LeafLink({ item }: { item: NavItem }) {
    const Icon = item.icon
    return (
      <Link href={item.href} className={leafClass(item.href === activeHref)}>
        <Icon className="h-4 w-4 shrink-0" />
        {t(item.labelKey)}
      </Link>
    )
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar md:flex">
      {/* Logo */}
      <div className="flex h-14 items-center px-6">
        <StoklyLogo tone="brand" />
      </div>

      {/* Sections */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scroll-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.labelKey} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.1em] text-sidebar-muted">
              {t(`section.${section.labelKey}`)}
            </p>
            {section.items.map((entry) => {
              if (!isNavGroup(entry)) {
                return <LeafLink key={entry.href} item={entry} />
              }
              const GroupIcon = entry.icon
              const hasActiveChild = entry.children.some(
                (c) => c.href === activeHref
              )
              const isOpen = open.has(entry.labelKey) || hasActiveChild
              return (
                <div key={entry.labelKey}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(entry.labelKey)}
                    className={cn(
                      'group flex h-9 w-full items-center gap-2.5 rounded-md border-l-2 border-transparent px-3 text-sm font-medium transition-all duration-150 ease-out',
                      hasActiveChild
                        ? 'text-white'
                        : 'text-sidebar-foreground hover:bg-[rgba(255,255,255,0.06)] hover:text-white'
                    )}
                    aria-expanded={isOpen}
                  >
                    <GroupIcon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{t(entry.labelKey)}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="mt-1 space-y-1 pl-3">
                      {entry.children.map((c) => (
                        <LeafLink key={c.href} item={c} />
                      ))}
                    </div>
                  )}
                </div>
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
        <SignOutButton
          action={onSignout}
          label={t('signout')}
          variant="tenant"
          className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60"
        />
      </div>
    </aside>
  )
}
