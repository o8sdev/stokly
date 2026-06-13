'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Menu, X, Globe, ArrowRight, ChevronDown } from 'lucide-react'
import { Link, usePathname, useRouter } from '@/lib/i18n/navigation'
import { cn } from '@/lib/utils'
import { StoklyLogo } from '@/components/brand/logo'
import { PRODUCT_FEATURES } from './product-links'

// Anchor links kept at the top level beside the Product dropdown.
const TOP_LINKS = [
  { id: 'how', key: 'how' },
  { id: 'pricing', key: 'pricing' },
] as const

// Paper nav: ink wordmark with a teal asterisk, mono uppercase links, a
// "Product" mega-dropdown of features, solid-ink CTA. Gains a paper-glass
// background once scrolled.
export function MarketingNav({ locale }: { locale: string }) {
  const t = useTranslations('landing.nav')
  const tf = useTranslations('landing.features')
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [productOpen, setProductOpen] = useState(false)
  const productRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the Product dropdown on outside click.
  useEffect(() => {
    if (!productOpen) return
    const onClick = (e: MouseEvent) => {
      if (productRef.current && !productRef.current.contains(e.target as Node)) {
        setProductOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [productOpen])

  function switchLocale() {
    const next = locale === 'az' ? 'ru' : 'az'
    startTransition(() => router.replace(pathname, { locale: next }))
  }

  const linkCls =
    'font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5b574a] transition-colors hover:text-[#1c1a14]'

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'mk-glass-dark' : 'border-b border-transparent'
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center">
          <StoklyLogo tone="ink" />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {/* Product mega-dropdown */}
          <div
            ref={productRef}
            className="relative"
            onMouseEnter={() => setProductOpen(true)}
            onMouseLeave={() => setProductOpen(false)}
          >
            <button
              onClick={() => setProductOpen((v) => !v)}
              className={cn(linkCls, 'flex items-center gap-1')}
              aria-expanded={productOpen}
            >
              {t('product')}
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  productOpen && 'rotate-180'
                )}
              />
            </button>

            {productOpen && (
              <div className="absolute left-0 top-full pt-3">
                <div className="mk-card-d w-[34rem] p-3 shadow-[0_18px_40px_-22px_rgba(28,26,20,0.4)]">
                  <p className="px-2 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8e8a7b]">
                    {tf('menu_label')}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {PRODUCT_FEATURES.map((f) => {
                      const Icon = f.icon
                      const inner = (
                        <>
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#ddd7c4] bg-[#fbfaf5] text-[#00926e]">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="flex items-center gap-2 text-sm text-[#1c1a14]">
                            {tf(f.key)}
                            {f.soon && (
                              <span className="rounded-sm bg-[#ece8db] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#8e8a7b]">
                                {tf('soon_badge')}
                              </span>
                            )}
                          </span>
                        </>
                      )
                      return f.soon ? (
                        <div
                          key={f.key}
                          className="flex items-start gap-2.5 rounded-md px-2 py-2 opacity-70"
                        >
                          {inner}
                        </div>
                      ) : (
                        <a
                          key={f.key}
                          href={`/${locale}${f.href}`}
                          onClick={() => setProductOpen(false)}
                          className="flex items-start gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-[#1c1a14]/[0.04]"
                        >
                          {inner}
                        </a>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {TOP_LINKS.map((s) => (
            <a key={s.id} href={`/${locale}#${s.id}`} className={linkCls}>
              {t(s.key)}
            </a>
          ))}
          <Link href="/blog" className={linkCls}>
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
            {/* Product features */}
            <p className="px-3 pt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8e8a7b]">
              {t('product')}
            </p>
            {PRODUCT_FEATURES.filter((f) => !f.soon).map((f) => (
              <a
                key={f.key}
                href={`/${locale}${f.href}`}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-[#1c1a14] hover:bg-[#1c1a14]/5"
              >
                {tf(f.key)}
              </a>
            ))}
            <div className="my-2 border-t border-[#ddd7c4]" />
            {TOP_LINKS.map((s) => (
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
