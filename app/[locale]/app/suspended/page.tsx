import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// Shown when a tenant is blocked: a trial that auto-suspended on expiry, or an
// account suspended for non-payment. Lives OUTSIDE the (protected) route group
// so requireTenant never gates it (no redirect loop). Only sign-out works here;
// reactivation is a payment the admin records, which flips the tenant back to
// active (migration 042).
export default async function SuspendedPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/app/login`)

  // Admins never belong on this screen.
  const { data: isAdmin } = await supabase.rpc('is_platform_admin')
  if (isAdmin === true) redirect(`/${locale}/admin`)

  const { data: member } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!member) redirect(`/${locale}/app/login`)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('status, trial_ends_at')
    .eq('id', member.tenant_id)
    .maybeSingle()

  const status = tenant?.status ?? 'active'
  const trialExpired =
    status === 'trial' &&
    !!tenant?.trial_ends_at &&
    new Date(tenant.trial_ends_at).getTime() < Date.now()
  // A still-good account has no business here — send it back into the app.
  if (
    status !== 'suspended' &&
    status !== 'churned' &&
    status !== 'deleted' &&
    !trialExpired
  ) {
    redirect(`/${locale}/app/dashboard`)
  }

  // The paid plan to activate (data-driven; price is editable in /admin/plans).
  const { data: plan } = await supabase
    .from('plans')
    .select('name_az, name_ru, monthly_price, currency')
    .eq('is_active', true)
    .eq('is_trial', false)
    .order('sort_order')
    .limit(1)
    .maybeSingle()
  const planName = plan ? (locale === 'ru' ? plan.name_ru : plan.name_az) : null

  async function handleSignout() {
    'use server'
    await signout(locale, `/${locale}/app/login`)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-semibold text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {t('app.name')}
          </div>
          <CardTitle className="text-xl">{t('suspended.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{t('suspended.body')}</p>
          {planName && (
            <div className="space-y-0.5 rounded-lg border bg-muted/40 p-3">
              <p className="font-medium text-foreground">
                {t('suspended.activate', { plan: planName })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('suspended.price', {
                  price: Number(plan?.monthly_price ?? 0),
                  currency: plan?.currency ?? 'AZN',
                })}
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{t('suspended.contact')}</p>
          <form action={handleSignout}>
            <Button type="submit" variant="outline" className="w-full">
              {t('suspended.signout')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
