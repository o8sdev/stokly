import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <TableSkeleton rows={9} cols={5} />
    </div>
  )
}
