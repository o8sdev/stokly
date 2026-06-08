import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/skeletons'

// Catch-all skeleton for admin-console tabs (dark surface). Most console pages
// are tables; page-specific files override where useful.
export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton dark />
      <TableSkeleton rows={9} cols={5} dark />
    </div>
  )
}
