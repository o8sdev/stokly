import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} cols={6} />
    </div>
  )
}
