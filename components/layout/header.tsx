'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, LogOut } from 'lucide-react'
import { usePathname, useRouter } from '@/lib/i18n/navigation'
import { NAV_SECTIONS } from './nav-items'
import { cn } from '@/lib/utils'

// Resolve the current page's nav label key from the longest matching href.
function activeLabelKey(pathname: string): string {
  const items = NAV_SECTIONS.flatMap((s) => s.items)
  let best = items[0]
  let bestLen = -1
  for (const item of items) {
    const matches =
      item.href === '/'
        ? pathname === '/'
        : pathname === item.href || pathname.startsWith(item.href + '/')
    if (matches && item.href.length > bestLen) {
      best = item
      bestLen = item.href.length
    }
  }
  return best.labelKey
}

function LocalePill({ locale }: { locale: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  function go(next: 'az' | 'ru') {
    if (next === locale || pending) return
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  const options: ('az' | 'ru')[] = ['az', 'ru']
  return (
    <div className="flex items-center rounded-md border border-border bg-card p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => go(opt)}
          className={cn(
            'h-6 rounded px-2 text-xs font-semibold uppercase transition-colors',
            locale === opt
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export function Header({
  email,
  locale,
  onSignout,
}: {
  email: string | null
  locale: string
  onSignout: () => Promise<void>
}) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const initial = (email ?? 'S').charAt(0).toUpperCase()
  const title = t(activeLabelKey(pathname))

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold md:hidden">
          <span className="text-brand">Stokly</span>
        </span>
        <h1 className="hidden text-lg font-semibold text-foreground md:block">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <LocalePill locale={locale} />
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Bildirişlər"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {initial}
        </div>
        {/* Mobile sign-out (desktop uses the sidebar footer). */}
        <form action={onSignout} className="md:hidden">
          <button
            type="submit"
            title={t('signout')}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  )
}
