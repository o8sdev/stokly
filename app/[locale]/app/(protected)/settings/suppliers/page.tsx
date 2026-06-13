import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ChevronLeft } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import { getSuppliers, getArchivedSuppliers } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { SuppliersManager } from './suppliers-manager'

export default async function SuppliersPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)
  const [suppliers, archived] = await Promise.all([
    getSuppliers(ctx.tenantId),
    getArchivedSuppliers(ctx.tenantId),
  ])

  return (
    <div>
      <PageHeader
        title={t('settings.suppliers_title')}
        action={
          <Button asChild variant="outline" className="gap-2">
            <Link href="/app/settings">
              <ChevronLeft className="h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
        }
      />
      <SuppliersManager
        locale={locale}
        suppliers={suppliers}
        archived={archived}
      />
    </div>
  )
}
