import { getTranslations } from 'next-intl/server'
import { CalendarClock } from 'lucide-react'
import { StoklyCard, MonoValue } from '@/components/ui/stokly-theme'
import { formatQuantity, formatDate } from '@/lib/utils'

export interface ExpiryRow {
  id: string
  ingredientName: string
  quantityRemaining: number
  unit: string
  expiryDate: string
  daysRemaining: number
}

// "Vaxtı Bitən Məhsullar" — active batches expiring within 7 days.
// Day badge: red if ≤ 2 days (or already past), amber if ≤ 7.
export async function ExpiryWidget({ rows }: { rows: ExpiryRow[] }) {
  const t = await getTranslations('dashboard')

  return (
    <StoklyCard className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <CalendarClock className="h-4 w-4 text-[#D97706]" />
        <h2 className="text-sm font-semibold">{t('expiry_title')}</h2>
      </div>
      <div className="flex-1 divide-y divide-[#F0F4F8]">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            {t('no_expiring')}
          </p>
        ) : (
          rows.map((row) => {
            const critical = row.daysRemaining <= 2
            const badge = critical
              ? { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' }
              : { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' }
            return (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {row.ingredientName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <MonoValue
                      value={formatQuantity(row.quantityRemaining)}
                      unit={row.unit}
                    />{' '}
                    · {formatDate(row.expiryDate)}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs font-medium tabular-nums"
                  style={{
                    backgroundColor: badge.bg,
                    color: badge.text,
                    borderColor: badge.border,
                  }}
                >
                  {row.daysRemaining < 0
                    ? t('expired_label')
                    : t('days_left', { days: row.daysRemaining })}
                </span>
              </div>
            )
          })
        )}
      </div>
    </StoklyCard>
  )
}
