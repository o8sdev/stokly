import { setRequestLocale } from 'next-intl/server'
import { MarketingShell, MarketingDoc } from '@/components/marketing/shell'
import { CAREERS, pickDoc } from '@/lib/marketing-pages'

export default function CareersPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const c = pickDoc(locale, CAREERS)
  const isRu = locale === 'ru'
  return (
    <MarketingShell locale={locale}>
      <MarketingDoc kicker={c.kicker} title={c.title} intro={c.intro}>
        <a
          href={`/${locale}`}
          className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-[#00926e] underline-offset-4 hover:underline"
        >
          {isRu ? 'На главную' : 'Ana səhifəyə qayıt'} →
        </a>
      </MarketingDoc>
    </MarketingShell>
  )
}
