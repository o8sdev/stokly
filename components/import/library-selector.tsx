'use client'

import { useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ArrowRight } from 'lucide-react'
import { Link, useRouter } from '@/lib/i18n/navigation'
import type { GlobalIngredient } from '@/types/database'
import { addFromLibrary } from '@/app/[locale]/app/(protected)/ingredients/import/actions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LibrarySelector({
  locale,
  library,
}: {
  locale: string
  library: GlobalIngredient[]
}) {
  const t = useTranslations('library')
  const tOnboard = useTranslations('onboarding')
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [category, setCategory] = useState<string>('all')
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<number | null>(null)

  // Distinct categories in first-seen order.
  const categories = useMemo(() => {
    const seen: string[] = []
    for (const g of library) if (!seen.includes(g.category)) seen.push(g.category)
    return seen
  }, [library])

  const visible = useMemo(
    () =>
      category === 'all'
        ? library
        : library.filter((g) => g.category === category),
    [library, category]
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      visible.forEach((g) => next.add(g.id))
      return next
    })
  }

  function add() {
    if (selected.size === 0) return
    startTransition(async () => {
      const res = await addFromLibrary(locale, JSON.stringify([...selected]))
      if (res.ok) {
        setDone(res.inserted ?? 0)
        router.refresh()
      }
    })
  }

  if (done !== null) {
    return (
      <div className="stokly-card flex flex-col items-center gap-4 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-6 w-6" />
        </div>
        <p className="text-lg font-semibold">{t('success', { count: done })}</p>
        <p className="text-sm text-muted-foreground">
          {tOnboard('prices_banner')}
        </p>
        <Button asChild>
          <Link href="/app/ingredients" className="gap-2">
            {tOnboard('library_btn')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <Pill active={category === 'all'} onClick={() => setCategory('all')}>
          {t('all')}
        </Pill>
        {categories.map((c) => (
          <Pill key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </Pill>
        ))}
        <button
          onClick={selectAllVisible}
          className="ml-auto rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('select_all')}
        </button>
      </div>

      {/* Cards */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((g) => {
          const isSelected = selected.has(g.id)
          const yieldPct = Math.round((g.default_yield_percent ?? 1) * 100)
          return (
            <button
              key={g.id}
              onClick={() => toggle(g.id)}
              className={cn(
                'relative rounded-xl border p-4 text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/40'
              )}
            >
              <span
                className={cn(
                  'absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-md border',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border'
                )}
              >
                {isSelected && <Check className="h-3.5 w-3.5" />}
              </span>
              <p className="pr-6 font-semibold text-foreground">{g.name_az}</p>
              {g.name_ru && (
                <p className="text-xs text-muted-foreground">{g.name_ru}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {g.default_unit}
                </span>
                {yieldPct < 100 && (
                  <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    {yieldPct}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Sticky footer */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:left-60">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <span className="text-sm font-medium">
              {t('selected', { count: selected.size })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelected(new Set())}
              >
                {t('cancel')}
              </Button>
              <Button onClick={add} disabled={pending}>
                {pending ? t('adding') : t('add')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'border border-border bg-card text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}
