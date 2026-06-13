import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ChevronLeft } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { ImportClient } from '@/components/import/import-client'

export default async function ImportPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  await requireTenant(locale)

  return (
    <div>
      <PageHeader
        title={t('import.title')}
        description={t('import.subtitle')}
        action={
          <Button asChild variant="outline" className="gap-2">
            <Link href="/app/ingredients">
              <ChevronLeft className="h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
        }
      />
      <ImportClient locale={locale} />
    </div>
  )
}
