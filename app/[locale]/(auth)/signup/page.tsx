import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { SignupForm } from './signup-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SignupPage({
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
          <CardTitle className="text-xl">{t('auth.signup_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SignupForm locale={locale} />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t('auth.have_account')}{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t('auth.login_link')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
