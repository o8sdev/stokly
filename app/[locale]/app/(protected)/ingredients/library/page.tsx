import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ChevronLeft } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import { getLibraryForTenant, getTenant } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { LibrarySelector } from '@/components/import/library-selector'

export default async function LibraryPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)
  const tenant = await getTenant(ctx.tenantId)
  const library = await getLibraryForTenant(tenant?.business_type ?? null)

  return (
    <div>
      <PageHeader
        title={t('library.title')}
        description={t('library.subtitle')}
        action={
          <Button asChild variant="outline" className="gap-2">
            <Link href="/app/ingredients">
              <ChevronLeft className="h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
        }
      />
      <LibrarySelector locale={locale} library={library} />
    </div>
  )
}
