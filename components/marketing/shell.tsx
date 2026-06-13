import { getTranslations } from 'next-intl/server'
import { StoklyLogo } from '@/components/brand/logo'
import { MarketingNav } from './marketing-nav'
import { PRODUCT_FEATURES } from './product-links'

// Fixed atmosphere layer: ruled ledger paper with a red margin line and a faint
// static grain. Shared by the landing and the other marketing pages.
export function MarketingAtmosphere() {
  return <div className="mk-atmos mk-noise" aria-hidden />
}

// Paper page chrome for the simple marketing pages (about / contact / careers /
// legal): atmosphere + nav + footer around the page content.
export function MarketingShell({
  locale,
  children,
}: {
  locale: string
  children: React.ReactNode
}) {
  return (
    <div className="mk-page relative min-h-screen overflow-clip font-sans">
      <MarketingAtmosphere />
      <MarketingNav locale={locale} />
      <main className="relative pt-16">{children}</main>
      <MarketingFooter locale={locale} />
    </div>
  )
}

// A ledger-styled document page (kicker + title + intro + numbered sections),
// used by the legal/about/contact content pages.
export function MarketingDoc({
  kicker,
  title,
  intro,
  updated,
  sections,
  children,
}: {
  kicker: string
  title: string
  intro?: string
  updated?: string
  sections?: { h: string; body: string }[]
  children?: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="flex items-center gap-4">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8e8a7b]">
          {kicker}
        </span>
        <span className="h-px flex-1 bg-[#ddd7c4]" aria-hidden />
      </div>
      <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-[#1c1a14]">
        {title}
      </h1>
      {updated && (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#8e8a7b]">
          {updated}
        </p>
      )}
      {intro && (
        <p className="mt-5 text-lg leading-relaxed text-[#5b574a]">{intro}</p>
      )}

      {sections && (
        <div className="mt-10 space-y-9">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="font-display text-xl font-semibold text-[#1c1a14]">
                {s.h}
              </h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-[#5b574a]">
                {s.body}
              </p>
            </section>
          ))}
        </div>
      )}

      {children}
    </div>
  )
}

// Receipt-style footer: hairline rules, four link columns (Product, Resources,
// Company, Legal), a thank-you sign-off — the way a till slip ends.
export async function MarketingFooter({ locale }: { locale: string }) {
  const t = await getTranslations('landing')
  const tf = await getTranslations('landing.features')
  const L = (suffix: string) => `/${locale}${suffix}`

  return (
    <footer className="relative border-t border-[#ddd7c4]">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.3fr_2.7fr]">
          <div className="max-w-xs">
            <StoklyLogo tone="ink" size="lg" />
            <p className="mt-3 text-sm leading-relaxed text-[#5b574a]">
              {t('footer.tagline')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {/* Product — the feature list */}
            <FooterCol heading={t('footer.product')}>
              {PRODUCT_FEATURES.map((f) =>
                f.soon ? (
                  <span
                    key={f.key}
                    className="text-sm text-[#a7a293]"
                    title={tf('soon_badge')}
                  >
                    {tf(f.key)}
                  </span>
                ) : (
                  <FooterLink key={f.key} href={L(f.href)}>
                    {tf(f.key)}
                  </FooterLink>
                )
              )}
            </FooterCol>

            {/* Resources */}
            <FooterCol heading={t('footer.resources')}>
              <FooterLink href={L('/blog')}>{t('footer.links.blog')}</FooterLink>
              <FooterLink href={L('#how')}>{t('footer.links.how')}</FooterLink>
              <FooterLink href={L('#faq')}>{t('footer.links.faq')}</FooterLink>
              <FooterLink href={L('#demo')}>{t('footer.links.demo')}</FooterLink>
            </FooterCol>

            {/* Company */}
            <FooterCol heading={t('footer.company')}>
              <FooterLink href={L('/about')}>
                {t('footer.links.about')}
              </FooterLink>
              <FooterLink href={L('/contact')}>
                {t('footer.links.contact')}
              </FooterLink>
              <FooterLink href={L('/careers')}>
                {t('footer.links.careers')}
              </FooterLink>
              <FooterLink href={L('#pricing')}>
                {t('footer.links.pricing')}
              </FooterLink>
            </FooterCol>

            {/* Legal */}
            <FooterCol heading={t('footer.legal')}>
              <FooterLink href={L('/legal/terms')}>
                {t('footer.links.terms')}
              </FooterLink>
              <FooterLink href={L('/legal/privacy')}>
                {t('footer.links.privacy')}
              </FooterLink>
              <FooterLink href={L('/legal/cookies')}>
                {t('footer.links.cookies')}
              </FooterLink>
            </FooterCol>
          </div>
        </div>

        {/* Till-slip sign-off */}
        <div className="mt-12 border-t border-dashed border-[#c9c2ab] pt-6 text-center">
          <p className="font-mono text-[11px] tracking-[0.18em] text-[#8e8a7b]">
            * * * {t('footer.rights')} * * *
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8e8a7b]">
        {heading}
      </p>
      <div className="mt-4 flex flex-col gap-2.5">{children}</div>
    </div>
  )
}

function FooterLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className="text-sm text-[#5b574a] underline-offset-4 transition-colors hover:text-[#1c1a14] hover:underline"
    >
      {children}
    </a>
  )
}
