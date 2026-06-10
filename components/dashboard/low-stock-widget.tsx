import { getTranslations } from 'next-intl/server'
import { AlertTriangle } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { StoklyCard, MonoValue } from '@/components/ui/stokly-theme'
import { formatQuantity } from '@/lib/utils'

export interface LowStockRow {
  id: string
  name: string
  unit: string
  currentStock: number
  threshold: number
}

export async function LowStockWidget({ rows }: { rows: LowStockRow[] }) {
  const t = await getTranslations('dashboard')

  return (
    <StoklyCard className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <AlertTriangle className="h-4 w-4 text-[#D97706]" />
        <h2 className="text-sm font-semibold">{t('low_stock')}</h2>
      </div>
      <div className="flex-1 divide-y divide-[#F0F4F8]">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            {t('no_low_stock')}
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  <MonoValue value={formatQuantity(row.currentStock)} />{' '}
                  / {t('threshold')}{' '}
                  <MonoValue value={formatQuantity(row.threshold)} /> {row.unit}
                </p>
              </div>
              <Link
                href="/app/purchases"
                className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {t('order')}
              </Link>
            </div>
          ))
        )}
      </div>
    </StoklyCard>
  )
}
