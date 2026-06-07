import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/* ──────────────────────────────────────────────────────────────────────────
   Stokly shared design components.
   Every page composes these so styling stays consistent and centralised.
   ────────────────────────────────────────────────────────────────────────── */

// Flat, bordered card — the base surface for the whole app.
export function StoklyCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('stokly-card', className)} {...props} />
}

// Numeric value in JetBrains Mono with tabular figures + optional unit suffix.
export function MonoValue({
  value,
  unit,
  className,
  unitClassName,
}: {
  value: React.ReactNode
  unit?: string | null
  className?: string
  unitClassName?: string
}) {
  return (
    <span className={cn('mono-value', className)}>
      {value}
      {unit ? (
        <span className={cn('ml-1 text-muted-foreground', unitClassName)}>
          {unit}
        </span>
      ) : null}
    </span>
  )
}

// Dashboard metric card: muted label, large mono value, coloured sub-line.
export function MetricCard({
  label,
  value,
  unit,
  sub,
  icon,
  className,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  sub?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <StoklyCard className={cn('px-6 py-5', className)}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {icon ? (
          <span className="text-muted-foreground/70">{icon}</span>
        ) : null}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-[28px] font-medium leading-none tabular-nums text-foreground">
          {value}
        </span>
        {unit ? (
          <span className="text-sm text-muted-foreground">{unit}</span>
        ) : null}
      </div>
      {sub ? <div className="mt-2 text-xs">{sub}</div> : null}
    </StoklyCard>
  )
}

/* ── Food-cost band badge ─────────────────────────────────────────────────
   < 25 Excellent · 25–30 Good · 30–35 Watch · 35–40 High · > 40 Critical   */

type Band = {
  bg: string
  text: string
  border: string
}

export function foodCostBand(percent: number): Band {
  if (percent < 25)
    return { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' }
  if (percent < 30)
    return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }
  if (percent < 35)
    return { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' }
  if (percent <= 40)
    return { bg: '#FFF7ED', text: '#9A3412', border: '#FDBA74' }
  return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' }
}

export function FoodCostBadge({
  percent,
  label,
  size = 'sm',
  className,
}: {
  percent: number
  label?: string
  size?: 'sm' | 'lg'
  className?: string
}) {
  const band = foodCostBand(percent)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-mono font-medium tabular-nums transition-colors duration-300',
        size === 'lg'
          ? 'px-3 py-1.5 text-2xl'
          : 'px-2 py-0.5 text-[13px]',
        className
      )}
      style={{
        backgroundColor: band.bg,
        color: band.text,
        borderColor: band.border,
      }}
    >
      {percent.toFixed(1)}%
      {label ? (
        <span
          className={cn(
            'font-sans font-medium',
            size === 'lg' ? 'text-sm' : 'text-[11px]'
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  )
}

/* ── Stock status badge ──────────────────────────────────────────────────── */

export type StockStatus = 'ok' | 'low' | 'out'

const STOCK_COLORS: Record<StockStatus, Band> = {
  ok: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  low: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  out: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
}

export function StockBadge({
  status,
  label,
  className,
}: {
  status: StockStatus
  label: string
  className?: string
}) {
  const c = STOCK_COLORS[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em]',
        className
      )}
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
    >
      {label}
    </span>
  )
}

// Neutral grey pill (e.g. yield % in the ingredient table).
export function NeutralPill({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground',
        className
      )}
    >
      {children}
    </span>
  )
}

/* ── DataTable ─────────────────────────────────────────────────────────────
   Card-wrapped table with a consistent header. Callers supply the column
   headers and render their own <TableRow> children for full control over
   per-row logic (links, badges, client interactivity).                      */

export interface DataColumn {
  label: string
  align?: 'left' | 'right' | 'center'
  className?: string
}

export function DataTable({
  columns,
  children,
  className,
}: {
  columns: DataColumn[]
  children: React.ReactNode
  className?: string
}) {
  return (
    <StoklyCard className={cn('overflow-hidden', className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col, i) => (
              <TableHead
                key={i}
                className={cn(
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.className
                )}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </StoklyCard>
  )
}

// Centred empty-state block for tables and lists.
export function EmptyState({
  message,
  action,
}: {
  message: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}
