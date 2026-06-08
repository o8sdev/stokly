import { cn } from '@/lib/utils'

/**
 * Loading placeholder with a smooth shimmer sweep. Defaults to the light app
 * surface; pass `dark` on the admin console (dark `#0a1622`) for the inverted
 * treatment. Honors `prefers-reduced-motion` (sweep disabled). Stagger the
 * sweep across a group via the `--sk-delay` CSS var.
 */
function Skeleton({
  className,
  dark,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { dark?: boolean }) {
  return (
    <div
      className={cn('rounded-md', dark ? 'skeleton-d' : 'skeleton', className)}
      {...props}
    />
  )
}

export { Skeleton }
