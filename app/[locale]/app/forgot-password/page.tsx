import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ForgotPasswordForm } from './forgot-password-form'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function ForgotPasswordPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-semibold text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {t('app.name')}
          </div>
          <CardTitle className="text-xl">{t('auth.forgot_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm locale={locale} />
        </CardContent>
      </Card>
    </main>
  )
}
