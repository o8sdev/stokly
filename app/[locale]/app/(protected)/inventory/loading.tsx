import {
  PageHeaderSkeleton,
  StatCardsSkeleton,
  TableSkeleton,
} from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} />
      <TableSkeleton rows={9} cols={5} />
    </div>
  )
}
