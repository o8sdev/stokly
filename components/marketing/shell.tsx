import { getTranslations } from 'next-intl/server'
import { StoklyLogo } from '@/components/brand/logo'

// Fixed atmosphere layer: ruled ledger paper with a red margin line and a faint
// static grain. Shared by the landing and blog pages.
export function MarketingAtmosphere() {
  return <div className="mk-atmos mk-noise" aria-hidden />
}

// Receipt-style footer: hairline rules, mono type, a thank-you line — the way a
// till slip ends.
export async function MarketingFooter({ locale }: { locale: string }) {
  const t = await getTranslations('landing')
  return (
    <footer className="border-t border-[#ddd7c4]">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <StoklyLogo tone="ink" size="lg" />
            <p className="mt-3 text-sm leading-relaxed text-[#5b574a]">
              {t('footer.tagline')}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8e8a7b]">
              {t('footer.product')}
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <FooterLink href={`/${locale}#product`}>
                {t('footer.links.services')}
              </FooterLink>
              <FooterLink href={`/${locale}#how`}>
                {t('footer.links.how')}
              </FooterLink>
              <FooterLink href={`/${locale}/blog`}>{t('nav.blog')}</FooterLink>
              <FooterLink href={`/${locale}#demo`}>
                {t('footer.links.demo')}
              </FooterLink>
            </div>
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
