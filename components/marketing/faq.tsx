'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FaqItem {
  q: string
  a: string
}

// Ruled-paper accordion: hairline rules, mono index numbers, a plus that
// rotates into a multiplication sign when open.
export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div>
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div
            key={i}
            className={cn(
              'border-t border-[#ddd7c4] transition-colors last:border-b',
              isOpen && 'bg-[#efebe0]/60'
            )}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-baseline gap-4 px-2 py-5 text-left sm:px-4"
            >
              <span className="font-mono text-xs font-semibold tabular-nums text-[#8e8a7b]">
                0{i + 1}
              </span>
              <span className="flex-1 font-display text-base font-semibold text-[#1c1a14] sm:text-lg">
                {item.q}
              </span>
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 translate-y-0.5 items-center justify-center rounded-[3px] border border-[#c9c2ab] text-[#1c1a14] transition-transform duration-300',
                  isOpen && 'rotate-45 border-[#00926e] text-[#00926e]'
                )}
              >
                <Plus className="h-3.5 w-3.5" />
              </span>
            </button>
            <div
              className={cn(
                'grid transition-all duration-300 ease-out',
                isOpen
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="overflow-hidden">
                <p className="px-2 pb-5 pl-10 text-[15px] leading-relaxed text-[#5b574a] sm:px-4 sm:pl-12">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
