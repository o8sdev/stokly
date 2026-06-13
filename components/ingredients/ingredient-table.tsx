'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Archive, ArchiveRestore, Pencil, Search } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import type { IngredientWithStock } from '@/types/app'
import {
  archiveIngredient,
  restoreIngredient,
} from '@/app/[locale]/app/(protected)/ingredients/actions'
import { ArchiveToggle } from '@/components/ui/archive-toggle'
import { TableCell, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DataTable,
  MonoValue,
  NeutralPill,
  StockBadge,
  EmptyState,
  type StockStatus,
} from '@/components/ui/stokly-theme'
import { formatMoney, formatQuantity, cn } from '@/lib/utils'

export function IngredientTable({
  locale,
  rows,
  archivedRows,
}: {
  locale: string
  rows: IngredientWithStock[]
  archivedRows: IngredientWithStock[]
}) {
  const t = useTranslations()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [showArchived, setShowArchived] = useState(false)
  const PAGE = 50

  const source = showArchived ? archivedRows : rows
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return source
    return source.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.name_az ?? '').toLowerCase().includes(q) ||
        (r.name_ru ?? '').toLowerCase().includes(q)
    )
  }, [source, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE))
  const clamped = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(clamped * PAGE, clamped * PAGE + PAGE)

  function stockStatus(row: IngredientWithStock): StockStatus {
    if (row.currentStock < 0) return 'negative'
    if (row.currentStock <= 0) return 'out'
    if (
      row.low_stock_threshold != null &&
      row.currentStock <= row.low_stock_threshold
    )
      return 'low'
    return 'ok'
  }

  const statusLabel: Record<StockStatus, string> = {
    ok: t('inventory.status_ok'),
    low: t('inventory.status_low'),
    out: t('inventory.status_zero'),
    negative: t('inventory.status_negative'),
  }

  return (
    <div className="space-y-4">
      <ArchiveToggle
        showArchived={showArchived}
        onChange={(v) => {
          setShowArchived(v)
          setPage(0)
        }}
        activeCount={rows.length}
        archivedCount={archivedRows.length}
      />
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0) }}
          placeholder={t('ingredients.search_placeholder')}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="stokly-card">
          <EmptyState
            message={
              query
                ? t('common.none')
                : showArchived
                  ? t('common.no_archived')
                  : t('ingredients.empty')
            }
            action={
              !query && !showArchived ? (
                <Button asChild size="sm">
                  <Link href="/app/ingredients/new">{t('ingredients.add')}</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <DataTable
          columns={[
            { label: t('ingredients.name') },
            { label: t('ingredients.unit') },
            { label: t('ingredients.cost'), align: 'right' },
            { label: t('ingredients.yield'), align: 'right' },
            { label: t('ingredients.current_stock'), align: 'right' },
            { label: t('ingredients.supplier') },
            { label: t('common.actions'), align: 'right' },
          ]}
        >
          {pageRows.map((row) => {
            const status = stockStatus(row)
            return (
              <TableRow
                key={row.id}
                className={showArchived ? 'opacity-60' : undefined}
              >
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.unit}
                </TableCell>
                <TableCell className="text-right">
                  <MonoValue value={formatMoney(row.cost_per_unit)} />
                </TableCell>
                <TableCell className="text-right">
                  <NeutralPill>
                    {Math.round(row.yield_percent * 100)}%
                  </NeutralPill>
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center justify-end gap-2">
                    <MonoValue
                      value={formatQuantity(row.currentStock)}
                      unit={row.unit}
                    />
                    <StockBadge status={status} label={statusLabel[status]} />
                  </span>
                </TableCell>
                <TableCell>
                  {row.supplierName ?? (
                    <span className="text-muted-foreground">
                      {t('ingredients.no_supplier')}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {showArchived ? (
                      <form
                        action={restoreIngredient.bind(null, locale, row.id)}
                      >
                        <button
                          type="submit"
                          title={t('common.restore')}
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors',
                            'hover:bg-secondary hover:text-foreground'
                          )}
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Link href={`/app/ingredients/${row.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <form
                          action={archiveIngredient.bind(null, locale, row.id)}
                        >
                          <button
                            type="submit"
                            title={t('common.archive')}
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors',
                              'hover:bg-[#FEF2F2] hover:text-[#E53E3E]'
                            )}
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </DataTable>
      )}
      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-end gap-3 text-sm">
          <button
            type="button"
            disabled={clamped === 0}
            onClick={() => setPage(clamped - 1)}
            className="rounded-md border border-border px-3 py-1.5 font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>
          <span className="tabular-nums text-muted-foreground">
            {clamped + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={clamped >= pageCount - 1}
            onClick={() => setPage(clamped + 1)}
            className="rounded-md border border-border px-3 py-1.5 font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
