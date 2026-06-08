import { getTranslations } from 'next-intl/server'
import { UploadCloud, BookOpen, PlusCircle, ArrowRight } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'

// Shown on the business dashboard while the tenant has zero ingredients.
// Disappears automatically once the first ingredient exists.
export async function OnboardingEmptyState() {
  const t = await getTranslations('onboarding')

  const options = [
    {
      href: '/app/ingredients/import',
      icon: UploadCloud,
      title: t('import_title'),
      desc: t('import_desc'),
      btn: t('import_btn'),
      primary: true,
    },
    {
      href: '/app/ingredients/library',
      icon: BookOpen,
      title: t('library_title'),
      desc: t('library_desc'),
      btn: t('library_btn'),
      primary: false,
    },
    {
      href: '/app/ingredients/new',
      icon: PlusCircle,
      title: t('manual_title'),
      desc: t('manual_desc'),
      btn: t('manual_btn'),
      primary: false,
    },
  ]

  return (
    <div className="mx-auto max-w-4xl py-10 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        {t('title')}
      </h1>
      <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {options.map((o) => {
          const Icon = o.icon
          return (
            <Link
              key={o.href}
              href={o.href}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-7 text-center transition-all hover:-translate-y-1 hover:border-primary/40 mk-shadow-card"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </span>
              <span className="font-display text-lg font-semibold">
                {o.title}
              </span>
              <span className="text-sm text-muted-foreground">{o.desc}</span>
              <span
                className={
                  'mt-2 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold ' +
                  (o.primary
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-foreground')
                }
              >
                {o.btn}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
