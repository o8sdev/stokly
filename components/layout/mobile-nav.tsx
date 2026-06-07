'use client'

import { useTranslations } from 'next-intl'
import { usePathname, Link } from '@/lib/i18n/navigation'
import { MOBILE_NAV } from './nav-items'
import { cn } from '@/lib/utils'

// Fixed bottom tab bar shown below the md breakpoint. Icons only.
export function MobileNav() {
  const t = useTranslations('nav')
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border bg-card md:hidden">
      {MOBILE_NAV.map((item) => {
        const active =
          item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
            <span className="truncate px-1">{t(item.labelKey)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
