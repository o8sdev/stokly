import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BusinessLoginForm } from './login-form'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// Hidden business portal login (not linked from the public site). Accounts are
// provisioned by the system admin — there is no self-serve signup.
export default async function BusinessLoginPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()

  // Already signed in and authorized? Skip to the right home. An account with
  // no membership (e.g. its tenant was deleted) falls through to the form,
  // rather than looping /app/dashboard → /app/login → …
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const { data: isAdmin } = await supabase.rpc('is_platform_admin')
    if (isAdmin === true) redirect(`/${locale}/admin`)
    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (member) redirect(`/${locale}/app/dashboard`)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-semibold text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {t('app.name')}
          </div>
          <CardTitle className="text-xl">{t('auth.login_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessLoginForm locale={locale} />
        </CardContent>
      </Card>
    </main>
  )
}
