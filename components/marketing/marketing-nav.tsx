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
  { id: 'pricing', key: 'pricing' },
  { id: 'faq', key: 'faq' },
] as const

// Paper nav: ink wordmark with a teal asterisk, mono uppercase section links,
// solid-ink CTA. Gains a paper-glass background once scrolled.
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
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-baseline gap-1">
          <span className="font-display text-xl font-bold tracking-tight text-[#1c1a14]">
            Stokly
          </span>
          <span className="text-lg leading-none text-[#00926e]">*</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`/${locale}#${s.id}`}
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5b574a] transition-colors hover:text-[#1c1a14]"
            >
              {t(s.key)}
            </a>
          ))}
          <Link
            href="/blog"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5b574a] transition-colors hover:text-[#1c1a14]"
          >
            {t('blog')}
          </Link>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={switchLocale}
            disabled={pending}
            className="flex items-center gap-1.5 rounded px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#5b574a] transition-colors hover:bg-[#1c1a14]/5 hover:text-[#1c1a14]"
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === 'az' ? 'RU' : 'AZ'}
          </button>
          <Link
            href="/app/login"
            className="rounded px-3 py-2 text-sm font-semibold text-[#1c1a14] underline-offset-4 transition-colors hover:underline"
          >
            {t('login')}
          </Link>
          <a
            href={`/${locale}#demo`}
            className="group inline-flex items-center gap-1.5 rounded-md bg-[#1c1a14] px-4 py-2 text-sm font-semibold text-[#f4f1e8] transition-colors hover:bg-[#00926e]"
          >
            {t('demo')}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[#1c1a14] md:hidden"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="mk-glass-dark border-t border-[#ddd7c4] px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`/${locale}#${s.id}`}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#5b574a] hover:bg-[#1c1a14]/5 hover:text-[#1c1a14]"
              >
                {t(s.key)}
              </a>
            ))}
            <Link
              href="/blog"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#5b574a] hover:bg-[#1c1a14]/5 hover:text-[#1c1a14]"
            >
              {t('blog')}
            </Link>
            <div className="mt-2 flex items-center gap-2 border-t border-[#ddd7c4] pt-3">
              <button
                onClick={switchLocale}
                className="flex items-center gap-1.5 rounded px-3 py-2 font-mono text-[11px] font-semibold uppercase text-[#5b574a] hover:text-[#1c1a14]"
              >
                <Globe className="h-3.5 w-3.5" />
                {locale === 'az' ? 'RU' : 'AZ'}
              </button>
              <Link
                href="/app/login"
                onClick={() => setOpen(false)}
                className="rounded-md border border-[#1c1a14]/25 px-3 py-2 text-sm font-semibold text-[#1c1a14]"
              >
                {t('login')}
              </Link>
              <a
                href={`/${locale}#demo`}
                onClick={() => setOpen(false)}
                className="flex-1 rounded-md bg-[#1c1a14] px-3 py-2 text-center text-sm font-semibold text-[#f4f1e8]"
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
