import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/skeletons'

// Catch-all skeleton for every business-app tab. Page-specific loading.tsx
// files (dashboard, ingredients, …) override this where a closer match helps.
export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <TableSkeleton rows={8} cols={5} />
    </div>
  )
}
