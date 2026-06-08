'use client'

import { useTranslations } from 'next-intl'
import { usePathname, Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/admin', key: 'home', exact: true },
  { href: '/admin/leads', key: 'leads', exact: false },
  { href: '/admin/tenants', key: 'tenants', exact: false },
  { href: '/admin/businesses/new', key: 'new_business', exact: false },
] as const

export function AdminNav() {
  const t = useTranslations('admin.nav')
  const pathname = usePathname()

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white'
            )}
          >
            {t(item.key)}
          </Link>
        )
      })}
    </nav>
  )
}
