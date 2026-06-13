import { setRequestLocale } from 'next-intl/server'
import { MarketingShell, MarketingDoc } from '@/components/marketing/shell'
import { CONTACT, CONTACT_EMAIL, pickDoc } from '@/lib/marketing-pages'

export default function ContactPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const c = pickDoc(locale, CONTACT)
  const isRu = locale === 'ru'
  return (
    <MarketingShell locale={locale}>
      <MarketingDoc
        kicker={c.kicker}
        title={c.title}
        intro={c.intro}
        sections={c.sections}
      >
        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center rounded-md border border-[#1c1a14]/25 px-5 py-2.5 text-sm font-semibold text-[#1c1a14] transition-colors hover:border-[#1c1a14]"
          >
            {isRu ? 'Написать e-mail' : 'E-poçt yaz'}
          </a>
          <a
            href={`/${locale}#demo`}
            className="inline-flex items-center rounded-md bg-[#1c1a14] px-5 py-2.5 text-sm font-semibold text-[#f4f1e8] transition-colors hover:bg-[#00926e]"
          >
            {isRu ? 'Запросить демо' : 'Demo tələb et'}
          </a>
        </div>
      </MarketingDoc>
    </MarketingShell>
  )
}
