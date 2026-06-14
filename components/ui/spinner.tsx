import { StoklySpinner } from '@/components/brand/logo'
import { cn } from '@/lib/utils'

/**
 * Indeterminate loading spinner — the Stokly mark whose spokes fade on a
 * staggered loop. Brand-teal by default via `text-brand`; pass a `className`
 * with a text color to recolor (it inherits `currentColor`).
 */
export function Spinner({
  size = 20,
  className,
}: {
  size?: number
  className?: string
}) {
  return <StoklySpinner size={size} className={cn('text-brand', className)} />
}

/**
 * Centered spinner "screen" for Suspense fallbacks where a skeleton would be
 * overkill (forms, detail panes).
 */
export function LoadingScreen({
  label,
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-[45vh] w-full flex-col items-center justify-center gap-3',
        className
      )}
    >
      <Spinner size={40} />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  )
}
