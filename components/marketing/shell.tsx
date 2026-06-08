import { getTranslations } from 'next-intl/server'

// Fixed atmosphere layer (drifting aurora + grain + blueprint) shared by the
// landing and blog pages.
export function MarketingAtmosphere() {
  return (
    <div className="mk-atmos mk-noise" aria-hidden>
      <div className="mk-blueprint absolute inset-0" />
      <div className="mk-aurora mk-aurora--teal mk-drift-a absolute -top-44 left-[6%] h-[640px] w-[640px]" />
      <div className="mk-aurora mk-aurora--cyan mk-drift-b absolute -top-10 right-[2%] h-[460px] w-[460px]" />
      <div className="mk-aurora mk-aurora--amber mk-drift-c absolute bottom-[-12%] left-[24%] h-[520px] w-[520px]" />
    </div>
  )
}

export async function MarketingFooter({ locale }: { locale: string }) {
  const t = await getTranslations('landing')
  return (
    <footer className="border-t border-white/[0.06] py-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div className="max-w-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            <span className="font-display text-xl font-bold text-white">
              Stokly
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#9fb2aa]">
            {t('footer.tagline')}
          </p>
        </div>
        <div className="flex gap-16">
          <FooterCol title={t('footer.product')}>
            <FooterLink href={`/${locale}#product`}>
              {t('footer.links.services')}
            </FooterLink>
            <FooterLink href={`/${locale}#how`}>{t('footer.links.how')}</FooterLink>
            <FooterLink href={`/${locale}/blog`}>{t('nav.blog')}</FooterLink>
            <FooterLink href={`/${locale}#demo`}>
              {t('footer.links.demo')}
            </FooterLink>
          </FooterCol>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-7xl px-5 lg:px-8">
        <p className="border-t border-white/[0.06] pt-6 text-xs text-[#6c7e77]">
          {t('footer.rights')}
        </p>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6c7e77]">
        {title}
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
      className="text-sm text-[#9fb2aa] transition-colors hover:text-white"
    >
      {children}
    </a>
  )
}
