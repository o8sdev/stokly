import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CreateBusinessForm } from './create-business-form'

export default async function NewBusinessPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations('admin')

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t('business.title')}</h1>
      <p className="mt-1 max-w-md text-sm text-slate-400">
        {t('business.subtitle')}
      </p>
      <div className="mt-6">
        <CreateBusinessForm locale={locale} />
      </div>
    </div>
  )
}
