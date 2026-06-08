'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Menu, X, Globe, ArrowRight } from 'lucide-react'
import { Link, usePathname, useRouter } from '@/lib/i18n/navigation'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'product', key: 'services' },
  { id: 'how', key: 'how' },
  { id: 'testimonials', key: 'testimonials' },
  { id: 'faq', key: 'faq' },
] as const

export function MarketingNav({ locale }: { locale: string }) {
  const t = useTranslations('landing.nav')
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function switchLocale() {
    const next = locale === 'az' ? 'ru' : 'az'
    startTransition(() => router.replace(pathname, { locale: next }))
  }

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'mk-glass-dark' : 'border-b border-transparent'
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="animate-mk-pulse h-2.5 w-2.5 rounded-full bg-brand" />
          <span className="font-display text-xl font-bold tracking-tight text-white">
            Stokly
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-sm font-medium text-[#9fb2aa] transition-colors hover:text-white"
            >
              {t(s.key)}
            </a>
          ))}
          <Link
            href="/blog"
            className="text-sm font-medium text-[#9fb2aa] transition-colors hover:text-white"
          >
            {t('blog')}
          </Link>
        </div>

        <div className="hidden items-center gap-1.5 md:flex">
          <button
            onClick={switchLocale}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase text-[#9fb2aa] transition-colors hover:bg-white/5 hover:text-white"
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === 'az' ? 'RU' : 'AZ'}
          </button>
          <Link
            href="/app/login"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#cdd9d3] transition-colors hover:bg-white/5 hover:text-white"
          >
            {t('login')}
          </Link>
          <a
            href="#demo"
            className="group inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-[#04231A] shadow-[0_10px_30px_-10px_rgba(0,200,150,0.6)] transition-colors hover:bg-brand-hover"
          >
            {t('demo')}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-white md:hidden"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="mk-glass-dark border-t border-white/10 px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-[#cdd9d3] hover:bg-white/5 hover:text-white"
              >
                {t(s.key)}
              </a>
            ))}
            <Link
              href="/blog"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-[#cdd9d3] hover:bg-white/5 hover:text-white"
            >
              {t('blog')}
            </Link>
            <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-3">
              <button
                onClick={switchLocale}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold uppercase text-[#9fb2aa] hover:bg-white/5 hover:text-white"
              >
                <Globe className="h-3.5 w-3.5" />
                {locale === 'az' ? 'RU' : 'AZ'}
              </button>
              <Link
                href="/app/login"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/12 px-3 py-2 text-sm font-semibold text-white"
              >
                {t('login')}
              </Link>
              <a
                href="#demo"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg bg-brand px-3 py-2 text-center text-sm font-semibold text-[#04231A]"
              >
                {t('demo')}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
