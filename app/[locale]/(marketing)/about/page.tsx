import { setRequestLocale } from 'next-intl/server'
import { MarketingShell, MarketingDoc } from '@/components/marketing/shell'
import { ABOUT, pickDoc } from '@/lib/marketing-pages'

export default function AboutPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const c = pickDoc(locale, ABOUT)
  return (
    <MarketingShell locale={locale}>
      <MarketingDoc
        kicker={c.kicker}
        title={c.title}
        intro={c.intro}
        sections={c.sections}
      />
    </MarketingShell>
  )
}
