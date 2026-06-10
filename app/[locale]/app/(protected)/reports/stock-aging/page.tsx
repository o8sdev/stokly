import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { getActiveBatches, getIngredients } from '@/lib/data/queries'
import { computeStockAging, type AgeBand } from '@/lib/calculations/stock-aging'
import { PageHeader } from '@/components/layout/page-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  StoklyCard,
  MetricCard,
  MonoValue,
  EmptyState,
} from '@/components/ui/stokly-theme'
import { formatMoney, formatQuantity, formatDate } from '@/lib/utils'

// Oldest band first (most at risk). Band → i18n key.
const BAND_ORDER: AgeBand[] = ['31+', '8-30', '0-7']
const BAND_KEY: Record<AgeBand, string> = {
  '0-7': 'band_0_7',
  '8-30': 'band_8_30',
  '31+': 'band_31',
}

export default async function StockAgingPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const [batches, ingredients] = await Promise.all([
    getActiveBatches(ctx.tenantId),
    getIngredients(ctx.tenantId),
  ])
  const aging = computeStockAging(batches, Date.now())
  const nameById = new Map(ingredients.map((i) => [i.id, i.name]))
  const bandSummary = new Map(aging.bands.map((b) => [b.band, b]))

  return (
    <div>
      <PageHeader
        title={t('reports.stock_aging')}
        description={t('stock_aging.subtitle')}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['0-7', '8-30', '31+'] as AgeBand[]).map((band) => {
          const b = bandSummary.get(band)
          return (
            <MetricCard
              key={band}
              label={t(`stock_aging.${BAND_KEY[band]}`)}
              value={(b?.value ?? 0).toFixed(2)}
              unit="AZN"
              sub={
                <span className="text-muted-foreground">
                  {t('stock_aging.batches_count', { count: b?.count ?? 0 })}
                </span>
              }
            />
          )
        })}
        <MetricCard
          label={t('stock_aging.at_risk')}
          value={aging.at_risk_value.toFixed(2)}
          unit="AZN"
          sub={
            <span
              className={
                aging.at_risk_value > 0
                  ? 'text-[#D97706]'
                  : 'text-muted-foreground'
              }
            >
              {t('stock_aging.at_risk_hint')}
            </span>
          }
        />
      </div>

      {aging.batches.length === 0 ? (
        <div className="stokly-card">
          <EmptyState message={t('stock_aging.empty')} />
        </div>
      ) : (
        <div className="space-y-6">
          {BAND_ORDER.map((band) => {
            const rows = aging.batches.filter((r) => r.band === band)
            if (rows.length === 0) return null
            const subtotal = rows.reduce((s, r) => s + r.value, 0)
            return (
              <StoklyCard key={band} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <span className="text-sm font-semibold">
                    {t(`stock_aging.${BAND_KEY[band]}`)}
                  </span>
                  <MonoValue
                    value={formatMoney(subtotal)}
                    className="text-sm text-muted-foreground"
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t('ingredients.name')}</TableHead>
                      <TableHead>{t('stock_aging.col_batch')}</TableHead>
                      <TableHead className="text-right">
                        {t('stock_aging.col_qty')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('reports.value')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('stock_aging.col_age')}
                      </TableHead>
                      <TableHead>{t('inventory.expiry_date')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {nameById.get(r.ingredient_id) ?? '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {r.batch_code ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <MonoValue
                            value={formatQuantity(r.quantity_remaining)}
                            unit={r.unit}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <MonoValue
                            value={formatMoney(r.value)}
                            className="font-medium"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <MonoValue
                            value={`${r.age_days} ${t('stock_aging.days')}`}
                          />
                        </TableCell>
                        <TableCell>
                          {r.expiry_date ? (
                            <span
                              className={
                                r.near_expiry
                                  ? 'inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#92400E]'
                                  : 'text-muted-foreground'
                              }
                            >
                              {formatDate(r.expiry_date)}
                              {r.near_expiry && ` · ${t('stock_aging.near_expiry')}`}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </StoklyCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
