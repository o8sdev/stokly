import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Users } from 'lucide-react'
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
          <Button asChild variant="outline" className="gap-2">
            <Link href="/settings/suppliers">
              <Users className="h-4 w-4" />
              {t('settings.suppliers_title')}
            </Link>
          </Button>
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
    </div>
  )
}
