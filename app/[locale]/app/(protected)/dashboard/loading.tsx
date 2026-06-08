import {
  PageHeaderSkeleton,
  StatCardsSkeleton,
  CardSkeleton,
} from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-2">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
      </div>
    </div>
  )
}
