import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Users, Warehouse } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import { getTenant } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SettingsForm } from './settings-form'
import { ChangePasswordForm } from './change-password-form'

export default async function SettingsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)
  const tenant = await getTenant(ctx.tenantId)

  if (!tenant) notFound()

  return (
    <div>
      <PageHeader
        title={t('settings.title')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/app/settings/locations">
                <Warehouse className="h-4 w-4" />
                {t('locations.title')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/app/settings/suppliers">
                <Users className="h-4 w-4" />
                {t('settings.suppliers_title')}
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t('settings.general')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm locale={locale} tenant={tenant} />
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-2xl">
        <CardHeader>
          <CardTitle>{t('settings.security')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('settings.password_hint')}
          </p>
          <ChangePasswordForm locale={locale} />
        </CardContent>
      </Card>
    </div>
  )
}
