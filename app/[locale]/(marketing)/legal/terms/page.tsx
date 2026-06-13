import { setRequestLocale } from 'next-intl/server'
import { MarketingShell, MarketingDoc } from '@/components/marketing/shell'
import { TERMS, LEGAL_UPDATED, pickDoc } from '@/lib/marketing-pages'

export default function TermsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const c = pickDoc(locale, TERMS)
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
