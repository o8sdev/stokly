'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, Building2, Ticket, Wallet, StickyNote } from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import type { SearchResult, SearchKind } from '@/lib/admin/search'

const KIND_ICON: Record<SearchKind, typeof Building2> = {
  tenant: Building2,
  invitation: Ticket,
  payment: Wallet,
  note: StickyNote,
}
const KIND_ORDER: SearchKind[] = ['tenant', 'invitation', 'payment', 'note']

export function AdminCommandMenu({
  onSearch,
}: {
  onSearch: (q: string) => Promise<SearchResult[]>
}) {
  const t = useTranslations('admin.search')
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  React.useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    let active = true
    setLoading(true)
    const handle = setTimeout(() => {
      onSearch(q)
        .then((r) => {
          if (active) setResults(r)
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 200)
    return () => {
      active = false
      clearTimeout(handle)
    }
  }, [query, open, onSearch])

  function go(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    items: results.filter((r) => r.kind === kind),
  })).filter((g) => g.items.length > 0)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{t('placeholder')}</span>
        <kbd className="ml-2 hidden rounded border border-white/15 px-1.5 font-mono text-[10px] text-slate-500 sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={t('placeholder')}
        />
        <CommandList>
          <CommandEmpty>
            {loading
              ? t('searching')
              : query.trim().length < 2
                ? t('hint')
                : t('empty')}
          </CommandEmpty>
          {grouped.map((g) => {
            const Icon = KIND_ICON[g.kind]
            return (
              <CommandGroup key={g.kind} heading={t(`kind_${g.kind}`)}>
                {g.items.map((r) => (
                  <CommandItem
                    key={`${r.kind}-${r.id}`}
                    value={`${r.kind}-${r.id}-${r.label}`}
                    onSelect={() => go(r.href)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="flex-1 truncate">{r.label}</span>
                    {r.sublabel && (
                      <span className="truncate text-xs text-slate-500">
                        {r.sublabel}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
        </CommandList>
      </CommandDialog>
    </>
  )
}
