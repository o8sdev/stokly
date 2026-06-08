'use client'

import { HelpCircle } from 'lucide-react'

// A small "?" icon that reveals an explanatory tooltip on hover / focus.
// CSS-only (no portal), positioned above the icon. Used next to form labels.
export function FieldHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        aria-label={text}
        className="inline-flex text-muted-foreground/60 transition-colors hover:text-primary focus:text-primary focus:outline-none"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-xs font-normal leading-relaxed text-popover-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
