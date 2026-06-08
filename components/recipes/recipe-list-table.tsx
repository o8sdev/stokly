'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import type { RecipeWithCost } from '@/types/app'
import { TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DataTable,
  MonoValue,
  FoodCostBadge,
  EmptyState,
} from '@/components/ui/stokly-theme'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/utils'

type Filter = 'all' | 'dishes' | 'sub'

export function RecipeListTable({ rows }: { rows: RecipeWithCost[] }) {
  const t = useTranslations('recipes')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    if (filter === 'dishes') return rows.filter((r) => !r.is_sub_recipe)
    if (filter === 'sub') return rows.filter((r) => r.is_sub_recipe)
    return rows
  }, [rows, filter])

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('filter_all') },
    { key: 'dishes', label: t('filter_dishes') },
    { key: 'sub', label: t('filter_sub') },
  ]

  return (
    <div className="space-y-4">
      {/* Segmented filter */}
      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'h-8 rounded-md px-3 text-sm font-medium transition-colors',
              filter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="stokly-card">
          <EmptyState message={t('empty')} />
        </div>
      ) : (
        <DataTable
          columns={[
            { label: t('name') },
            { label: t('ingredient_count'), align: 'right' },
            { label: t('total_cost'), align: 'right' },
            { label: t('food_cost'), align: 'right' },
            { label: t('sale_price'), align: 'right' },
            { label: '', align: 'right' },
          ]}
        >
          {filtered.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                <span className="flex items-center gap-2">
                  {row.name}
                  {row.is_sub_recipe && (
                    <Badge variant="secondary">{t('is_sub_recipe')}</Badge>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <MonoValue value={row.ingredientCount} />
              </TableCell>
              <TableCell className="text-right">
                <MonoValue value={formatMoney(row.totalCost)} />
              </TableCell>
              <TableCell className="text-right">
                {row.sale_price ? (
                  <FoodCostBadge percent={row.foodCostPercent} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {row.sale_price ? (
                  <MonoValue value={formatMoney(row.sale_price)} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                  <Link href={`/app/recipes/${row.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  )
}
