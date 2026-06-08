import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/utils'

// Compact page window, e.g. 1 … 4 5 [6] 7 8 … 20
function pageWindow(page: number, pageCount: number): (number | '…')[] {
  const out: (number | '…')[] = []
  const push = (n: number) => out.push(n)
  const around = 1
  const first = 1
  const last = pageCount
  const from = Math.max(first, page - around)
  const to = Math.min(last, page + around)
  push(first)
  if (from > first + 1) out.push('…')
  for (let p = from; p <= to; p++) if (p !== first && p !== last) push(p)
  if (to < last - 1) out.push('…')
  if (last !== first) push(last)
  return out
}

export interface PaginationProps {
  page: number
  pageCount: number
  hrefForPage: (page: number) => string
  className?: string
}

export function Pagination({
  page,
  pageCount,
  hrefForPage,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null
  const items = pageWindow(page, pageCount)
  const cell =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors'

  return (
    <nav className={cn('flex items-center gap-1', className)}>
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className={cn(cell, 'text-slate-300 hover:bg-white/10')}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(cell, 'cursor-not-allowed text-slate-600')}>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {items.map((it, i) =>
        it === '…' ? (
          <span key={`gap-${i}`} className={cn(cell, 'text-slate-600')}>
            …
          </span>
        ) : (
          <Link
            key={it}
            href={hrefForPage(it)}
            className={cn(
              cell,
              it === page
                ? 'bg-brand font-semibold text-[#04231A]'
                : 'text-slate-300 hover:bg-white/10'
            )}
          >
            {it}
          </Link>
        )
      )}

      {page < pageCount ? (
        <Link href={hrefForPage(page + 1)} className={cn(cell, 'text-slate-300 hover:bg-white/10')}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(cell, 'cursor-not-allowed text-slate-600')}>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  )
}
