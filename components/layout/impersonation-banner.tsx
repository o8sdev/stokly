import { getTranslations } from 'next-intl/server'
import { Eye } from 'lucide-react'

// Shown across the business app when a system admin is viewing/editing a
// restaurant in god-mode. Exiting clears the impersonation cookie.
export async function ImpersonationBanner({
  tenantName,
  onExit,
}: {
  tenantName: string
  onExit: () => Promise<void>
}) {
  const t = await getTranslations('admin')
  return (
    <div className="flex items-center justify-between gap-3 bg-[#0d1b2a] px-4 py-2 text-sm text-white md:px-6">
      <span className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-brand" />
        {t('viewing_as')}{' '}
        <strong className="font-semibold text-brand">{tenantName}</strong>
      </span>
      <form action={onExit}>
        <button
          type="submit"
          className="rounded-md border border-white/20 px-3 py-1 text-xs font-medium transition-colors hover:bg-white/10"
        >
          {t('exit_view')}
        </button>
      </form>
    </div>
  )
}
