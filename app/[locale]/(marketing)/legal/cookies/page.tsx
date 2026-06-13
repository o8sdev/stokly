import { setRequestLocale } from 'next-intl/server'
import { MarketingShell, MarketingDoc } from '@/components/marketing/shell'
import { COOKIES, LEGAL_UPDATED, pickDoc } from '@/lib/marketing-pages'

export default function CookiesPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const c = pickDoc(locale, COOKIES)
  return (
    <MarketingShell locale={locale}>
      <MarketingDoc
        kicker={c.kicker}
        title={c.title}
        intro={c.intro}
        updated={LEGAL_UPDATED[locale === 'ru' ? 'ru' : 'az']}
        sections={c.sections}
      />
    </MarketingShell>
  )
}
