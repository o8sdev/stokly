import { getTranslations } from 'next-intl/server'
import { ClipboardCheck, ArrowRight } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'

// Shown on the sales pages when the business hasn't done its initial (zero)
// stock count yet. Sales can't precede opening inventory — you can't sell stock
// that was never counted in.
export async function NeedsInitialCount() {
  const t = await getTranslations('sales')
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-amber-500/40 bg-amber-500/[0.07] p-6 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
        <ClipboardCheck className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">{t('needs_count_title')}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t('needs_count_body')}
      </p>
      <Link
        href="/app/inventory/count"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {t('go_to_count')}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
