import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/** Shared "dark surface" flag — true on the admin console, false in the app. */
type DarkProp = { dark?: boolean }

/** Stagger the shimmer sweep so rows cascade instead of pulsing in unison. */
const delay = (ms: number): React.CSSProperties =>
  ({ '--sk-delay': `${ms}ms` }) as React.CSSProperties

const card = (dark?: boolean) =>
  cn(
    'rounded-xl border p-4 md:p-5',
    dark ? 'border-white/10 bg-white/[0.03]' : 'border-border bg-card'
  )

/** Title + subtitle + a single action button — mirrors <PageHeader>. */
export function PageHeaderSkeleton({ dark }: DarkProp) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2.5">
        <Skeleton dark={dark} className="h-7 w-48" />
        <Skeleton dark={dark} className="h-4 w-64" />
      </div>
      <Skeleton dark={dark} className="h-10 w-32 rounded-lg" />
    </div>
  )
}

/** A row of metric cards (dashboard / summary headers). */
export function StatCardsSkeleton({
  count = 4,
  dark,
}: { count?: number } & DarkProp) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={card(dark)}>
          <Skeleton dark={dark} className="h-4 w-20" style={delay(i * 80)} />
          <Skeleton
            dark={dark}
            className="mt-3 h-8 w-24"
            style={delay(i * 80 + 60)}
          />
          <Skeleton
            dark={dark}
            className="mt-3 h-3 w-16"
            style={delay(i * 80 + 120)}
          />
        </div>
      ))}
    </div>
  )
}

/** A titled card with stacked label/value rows (widgets, panels). */
export function CardSkeleton({
  lines = 4,
  dark,
  className,
}: { lines?: number; className?: string } & DarkProp) {
  return (
    <div className={cn(card(dark), className)}>
      <Skeleton dark={dark} className="h-5 w-40" />
      <div className="mt-5 space-y-3.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <Skeleton dark={dark} className="h-4 w-1/2" style={delay(i * 70)} />
            <Skeleton dark={dark} className="h-4 w-14" style={delay(i * 70)} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** A bordered data table: header strip + striped rows that cascade in. */
export function TableSkeleton({
  rows = 8,
  cols = 5,
  dark,
}: { rows?: number; cols?: number } & DarkProp) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border',
        dark ? 'border-white/10' : 'border-border bg-card'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-4 px-4 py-3',
          dark ? 'bg-white/[0.03]' : 'bg-background'
        )}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            dark={dark}
            className={cn('h-3', i === 0 ? 'w-1/4' : 'max-w-[110px] flex-1')}
          />
        ))}
      </div>
      <div className={cn('divide-y', dark ? 'divide-white/[0.06]' : 'divide-border')}>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                dark={dark}
                className={cn('h-4', c === 0 ? 'w-1/4' : 'max-w-[110px] flex-1')}
                style={delay(r * 45)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** A responsive grid of generic cards (report tiles, settings sections). */
export function CardGridSkeleton({
  count = 6,
  dark,
}: { count?: number } & DarkProp) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={card(dark)} style={delay(i * 60)}>
          <Skeleton dark={dark} className="h-9 w-9 rounded-lg" />
          <Skeleton dark={dark} className="mt-4 h-5 w-32" />
          <Skeleton dark={dark} className="mt-2.5 h-3.5 w-full" />
          <Skeleton dark={dark} className="mt-2 h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  )
}
