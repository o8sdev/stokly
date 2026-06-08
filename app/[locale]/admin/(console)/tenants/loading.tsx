import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton dark />
      <TableSkeleton rows={10} cols={6} dark />
    </div>
  )
}
