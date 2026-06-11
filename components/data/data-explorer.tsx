'use client'

import { type ReactNode, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { StoklyCard, EmptyState } from '@/components/ui/stokly-theme'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

export type CellValue = string | number | null

// A column is defined in a CLIENT component (accessor/render are closures and
// can't cross the server→client boundary). `accessor` feeds sorting + search;
// `render` is the display node (defaults to the accessor's string form).
export interface ExplorerColumn<Row> {
  key: string
  label: string
  align?: 'left' | 'right'
  sortable?: boolean
  searchable?: boolean
  accessor: (row: Row) => CellValue
  render?: (row: Row) => ReactNode
}

interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

// Generic client-side table: free-text search across searchable columns, click-to
// -sort headers (desc → asc → off), and pagination. Built for the owner data
// explorers; the server hands it a date-windowed, fully serializable row set.
export function DataExplorer<Row>({
  rows,
  columns,
  initialSort,
  pageSize = 25,
  searchPlaceholder,
  rowKey,
}: {
  rows: Row[]
  columns: ExplorerColumn<Row>[]
  initialSort?: SortState
  pageSize?: number
  searchPlaceholder?: string
  rowKey: (row: Row, index: number) => string
}) {
  const t = useTranslations('explorer')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null)
  const [page, setPage] = useState(0)

  const searchCols = useMemo(
    () => columns.filter((c) => c.searchable),
    [columns]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      searchCols.some((c) => {
        const v = c.accessor(r)
        return v != null && String(v).toLowerCase().includes(q)
      })
    )
  }, [rows, query, searchCols])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return filtered
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = col.accessor(a)
      const bv = col.accessor(b)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir
      }
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [filtered, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const clampedPage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(
    clampedPage * pageSize,
    clampedPage * pageSize + pageSize
  )

  function toggleSort(key: string) {
    setPage(0)
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'desc' }
      if (prev.dir === 'desc') return { key, dir: 'asc' }
      return null
    })
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(0)
          }}
          placeholder={searchPlaceholder ?? t('search')}
          className="max-w-xs"
        />
        <span className="shrink-0 text-xs text-muted-foreground">
          {t('results', { count: sorted.length })}
        </span>
      </div>

      <StoklyCard className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={cn(c.align === 'right' && 'text-right')}
                >
                  {c.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={cn(
                        'inline-flex items-center gap-1 transition-colors hover:text-foreground',
                        c.align === 'right' && 'flex-row-reverse'
                      )}
                    >
                      {c.label}
                      {sort?.key === c.key ? (
                        sort.dir === 'asc' ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState message={t('empty')} />
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r, i) => (
                <TableRow key={rowKey(r, clampedPage * pageSize + i)}>
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={cn(c.align === 'right' && 'text-right')}
                    >
                      {c.render
                        ? c.render(r)
                        : ((v) => (v == null ? '—' : String(v)))(c.accessor(r))}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </StoklyCard>

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-end gap-3 text-sm">
          <button
            type="button"
            disabled={clampedPage === 0}
            onClick={() => setPage(clampedPage - 1)}
            className="rounded-md border border-border px-3 py-1.5 font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('prev')}
          </button>
          <span className="tabular-nums text-muted-foreground">
            {clampedPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={clampedPage >= pageCount - 1}
            onClick={() => setPage(clampedPage + 1)}
            className="rounded-md border border-border px-3 py-1.5 font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('next')}
          </button>
        </div>
      )}
    </div>
  )
}
