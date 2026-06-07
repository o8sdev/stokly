import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { Button } from '@/components/ui/button'

export default async function NotFound() {
  const t = await getTranslations('nav')
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <Button asChild>
        <Link href="/dashboard">{t('dashboard')}</Link>
      </Button>
    </div>
  )
}
