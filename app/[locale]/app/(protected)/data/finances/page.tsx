import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Receipt, TrendingUp, Percent, Wallet } from 'lucide-react'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getOverview,
  resolveRange,
  RANGE_PRESETS,
  type RangePreset,
} from '@/lib/data/overview'
import { getStockMovements, getIngredients } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { RangeSelector } from '@/components/dashboard/range-selector'
import {
  MetricCard,
  StoklyCard,
  foodCostBand,
} from '@/components/ui/stokly-theme'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

const money = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default async function FinancesPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { range?: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const preset: RangePreset = RANGE_PRESETS.includes(
    searchParams.range as RangePreset
  )
    ? (searchParams.range as RangePreset)
    : 'this_month'
  const range = resolveRange(preset)

  const [movements, ingredients] = await Promise.all([
    getStockMovements(ctx.tenantId),
    getIngredients(ctx.tenantId),
  ])
  const overview = await getOverview(ctx.tenantId, range, {
    movements,
    ingredients,
  })
  const cur = overview.current
  const prev = overview.previous

  const margin = cur.revenue > 0 ? (cur.grossProfit / cur.revenue) * 100 : null
  const prevMargin =
    prev.revenue > 0 ? (prev.grossProfit / prev.revenue) * 100 : null
  const curChange = Math.round((cur.inventoryValue - cur.inventoryOpening) * 100) / 100
  const prevChange =
    Math.round((prev.inventoryValue - prev.inventoryOpening) * 100) / 100

  // One statement row: label + this-period value + previous-period value.
  function Row({
    label,
    cur: c,
    prev: p,
    strong,
    negative,
    sub,
  }: {
    label: string
    cur: number
    prev: number
    strong?: boolean
    negative?: boolean
    sub?: string
  }) {
    const fmt = (n: number) =>
      negative && n > 0 ? `(${money(n)})` : money(n)
    return (
      <TableRow className={strong ? 'font-semibold' : undefined}>
        <TableCell>
          {label}
          {sub ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {sub}
            </span>
          ) : null}
        </TableCell>
        <TableCell
          className={`text-right font-mono tabular-nums ${negative ? 'text-red-600' : ''}`}
        >
          {fmt(c)}
        </TableCell>
        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
          {fmt(p)}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('finances.title')}
        description={t('finances.desc')}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {range.from} — {range.to}
        </p>
        <RangeSelector />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('finances.revenue')}
          value={money(cur.revenue)}
          unit="AZN"
          icon={<Receipt className="h-4 w-4" />}
        />
        <MetricCard
          label={t('finances.gross_profit')}
          value={money(cur.grossProfit)}
          unit="AZN"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          label={t('finances.gross_margin')}
          value={margin != null ? margin.toFixed(1) : '—'}
          unit={margin != null ? '%' : undefined}
          icon={<Percent className="h-4 w-4" />}
        />
        <MetricCard
          label={t('finances.food_cost')}
          value={
            <span
              style={{
                color:
                  cur.foodCostPercent != null
                    ? foodCostBand(cur.foodCostPercent).text
                    : undefined,
              }}
            >
              {cur.foodCostPercent != null
                ? cur.foodCostPercent.toFixed(1)
                : '—'}
            </span>
          }
          unit={cur.foodCostPercent != null ? '%' : undefined}
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>

      <h2 className="mb-3 mt-6 text-sm font-semibold">
        {t('finances.statement')}
      </h2>
      <StoklyCard className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t('finances.line')}</TableHead>
              <TableHead className="text-right">
                {t('finances.this_period')}
              </TableHead>
              <TableHead className="text-right">
                {t('finances.prev_period')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <Row label={t('finances.revenue')} cur={cur.revenue} prev={prev.revenue} />
            <Row
              label={t('finances.cogs')}
              cur={cur.cogs}
              prev={prev.cogs}
              negative
            />
            <Row
              label={t('finances.gross_profit')}
              cur={cur.grossProfit}
              prev={prev.grossProfit}
              strong
              sub={
                margin != null
                  ? `${margin.toFixed(1)}%${prevMargin != null ? ` · ${prevMargin.toFixed(1)}%` : ''}`
                  : undefined
              }
            />
            <Row
              label={t('finances.purchases')}
              cur={cur.purchases}
              prev={prev.purchases}
            />
            <Row
              label={t('finances.waste')}
              cur={cur.wasteValue}
              prev={prev.wasteValue}
            />
            <Row
              label={t('finances.inv_opening')}
              cur={cur.inventoryOpening}
              prev={prev.inventoryOpening}
            />
            <Row
              label={t('finances.inv_closing')}
              cur={cur.inventoryValue}
              prev={prev.inventoryValue}
            />
            <Row
              label={t('finances.inv_change')}
              cur={curChange}
              prev={prevChange}
            />
          </TableBody>
        </Table>
      </StoklyCard>
    </div>
  )
}
