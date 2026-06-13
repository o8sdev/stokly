'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

// Active ⇄ Archived segmented switch shared by the master-data managers
// (ingredients, recipes, suppliers, locations). Stays hidden until there is at
// least one archived row, so tenants who never archive anything never see it.
export function ArchiveToggle({
  showArchived,
  onChange,
  activeCount,
  archivedCount,
}: {
  showArchived: boolean
  onChange: (v: boolean) => void
  activeCount: number
  archivedCount: number
}) {
  const t = useTranslations('common')
  if (archivedCount === 0 && !showArchived) return null
  return (
    <div className="inline-flex rounded-lg border border-border bg-secondary/30 p-0.5 text-sm">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          'rounded-md px-3 py-1 transition-colors',
          !showArchived
            ? 'bg-card font-medium shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {t('view_active')} ({activeCount})
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          'rounded-md px-3 py-1 transition-colors',
          showArchived
            ? 'bg-card font-medium shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {t('view_archived')} ({archivedCount})
      </button>
    </div>
  )
}
