import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ChevronLeft } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getStorageLocations,
  getArchivedLocations,
  getLocationsInUse,
} from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { LocationsManager } from './locations-manager'

export default async function LocationsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)
  const [locations, archived, used] = await Promise.all([
    getStorageLocations(ctx.tenantId),
    getArchivedLocations(ctx.tenantId),
    getLocationsInUse(ctx.tenantId),
  ])

  return (
    <div>
      <PageHeader
        title={t('locations.title')}
        description={t('locations.subtitle')}
        action={
          <Button asChild variant="outline" className="gap-2">
            <Link href="/app/settings">
              <ChevronLeft className="h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
        }
      />
      <LocationsManager
        locale={locale}
        locations={locations}
        archived={archived}
        usedIds={[...used]}
      />
    </div>
  )
}
