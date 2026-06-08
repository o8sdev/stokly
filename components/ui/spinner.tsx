import { cn } from '@/lib/utils'

/**
 * Indeterminate ring spinner. Brand-teal by default; inherits `currentColor`
 * for the track so it reads on both the light app and the dark admin console.
 */
export function Spinner({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      role="status"
      aria-label="Yüklənir"
      className={cn(
        'inline-block aspect-square w-5 shrink-0 animate-spin rounded-full',
        'border-2 border-current/25 border-t-current text-brand align-[-0.125em]',
        className
      )}
      {...props}
    />
  )
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
      <Spinner className="w-8 border-[3px]" />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  )
}
