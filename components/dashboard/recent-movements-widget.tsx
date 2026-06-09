import { getTranslations } from 'next-intl/server'
import { StoklyCard, MonoValue } from '@/components/ui/stokly-theme'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { MovementType } from '@/types/database'
import { formatQuantity, formatRelativeTime } from '@/lib/utils'

export interface MovementRow {
  id: string
  type: MovementType
  ingredientName: string
  quantity: number
  unit: string
  isAbsolute: boolean
  createdAt: string
  user: string
}

const TYPE_VARIANT: Record<
  MovementType,
  'default' | 'success' | 'warning' | 'danger' | 'secondary'
> = {
  delivery: 'success',
  count: 'secondary',
  waste: 'danger',
  adjustment: 'warning',
  sale: 'default',
  production_input: 'warning',
  production_output: 'success',
  expiry_writeoff: 'danger',
  transfer: 'secondary',
}

export async function RecentMovementsWidget({
  rows,
  locale,
}: {
  rows: MovementRow[]
  locale: string
}) {
  const t = await getTranslations()

  return (
    <StoklyCard className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold">
          {t('dashboard.recent_movements')}
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          {t('dashboard.no_movements')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t('dashboard.col_time')}</TableHead>
              <TableHead>{t('ingredients.name')}</TableHead>
              <TableHead>{t('dashboard.col_type')}</TableHead>
              <TableHead className="text-right">
                {t('dashboard.col_quantity')}
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                {t('dashboard.col_user')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatRelativeTime(row.createdAt, locale)}
                </TableCell>
                <TableCell className="font-medium">
                  {row.ingredientName}
                </TableCell>
                <TableCell>
                  <Badge variant={TYPE_VARIANT[row.type]}>
                    {t(`movement_type.${row.type}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <MonoValue
                    value={`${row.isAbsolute ? '=' : ''}${formatQuantity(
                      row.quantity
                    )}`}
                    unit={row.unit}
                  />
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                  {row.user}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </StoklyCard>
  )
}
