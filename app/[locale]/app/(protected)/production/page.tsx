import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Factory } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { StoklyCard } from '@/components/ui/stokly-theme'

// Phase 2 placeholder. The data model (production_runs, production_run_inputs,
// ingredient_batches, FIFO/cost helpers) already exists; the full screen ships
// in Phase 2.
export default async function ProductionPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations('production')

  return (
    <div>
      <PageHeader title={t('title')} />
      <StoklyCard className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Factory className="h-7 w-7" />
        </div>
        <div>
          <p className="text-lg font-semibold">{t('coming_soon')}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {t('coming_soon_desc')}
          </p>
        </div>
      </StoklyCard>
    </div>
  )
}
