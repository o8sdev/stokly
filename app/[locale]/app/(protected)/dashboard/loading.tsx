import { Skeleton } from '@/components/ui/skeleton'
import {
  StatCardsSkeleton,
  CardSkeleton,
} from '@/components/ui/skeletons'

// First-navigation skeleton, mirroring the streamed dashboard shell: hero line,
// quick-action row, KPI band, chart card.
export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-72" />
      <Skeleton className="mt-2 h-4 w-44" />
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-11 rounded-xl" />
        ))}
      </div>
      <div className="mb-4 mt-5 flex justify-end">
        <Skeleton className="h-9 w-64 rounded-lg" />
      </div>
      <StatCardsSkeleton count={6} />
      <div className="mt-4">
        <CardSkeleton lines={6} />
      </div>
    </div>
  )
}
