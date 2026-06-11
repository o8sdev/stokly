import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  Carrot,
  ChefHat,
  Factory,
  Receipt,
  ClipboardList,
  BarChart3,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'

// A short "How Stokly works" explainer — the flow from raw stock to reports,
// with the tomato-sauce / nuggets examples. Linked from the Getting-Started card
// and the sidebar.
const SECTIONS = [
  { key: 'ingredients', icon: Carrot },
  { key: 'recipes', icon: ChefHat },
  { key: 'production', icon: Factory },
  { key: 'sales', icon: Receipt },
  { key: 'counts', icon: ClipboardList },
  { key: 'reports', icon: BarChart3 },
] as const

export default async function GuidePage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations('guide')

  return (
    <div>
      <PageHeader title={t('title')} description={t('intro')} />
      <div className="max-w-3xl space-y-4">
        {SECTIONS.map(({ key, icon: Icon }) => (
          <div key={key} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold">{t(`${key}_h`)}</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(`${key}_body`)}
            </p>
            <p className="mt-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs">
              <span className="font-semibold">{t('example_label')}: </span>
              {t(`${key}_ex`)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
