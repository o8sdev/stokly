'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Sparkles } from 'lucide-react'
import { addFromLibrary } from '@/app/[locale]/app/(protected)/ingredients/import/actions'
import type { GlobalIngredient } from '@/types/database'

// One-click "quick add" chips for the everyday basics. Reuses the library add
// action; each tap inserts the ingredient (price filled in later) and removes
// the chip. Renders nothing when there's nothing left to add.
export function QuickAdd({
  locale,
  items,
}: {
  locale: string
  items: GlobalIngredient[]
}) {
  const t = useTranslations('ingredients')
  const router = useRouter()
  const [remaining, setRemaining] = useState<GlobalIngredient[]>(items)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pendingAll, startAll] = useTransition()

  if (remaining.length === 0) return null

  const label = (g: GlobalIngredient) =>
    locale === 'ru' ? g.name_ru || g.name_az : g.name_az

  async function addOne(g: GlobalIngredient) {
    if (busyId || pendingAll) return
    setBusyId(g.id)
    const res = await addFromLibrary(locale, JSON.stringify([g.id]))
    if (res?.error) {
      setBusyId(null)
      return
    }
    setRemaining((prev) => prev.filter((x) => x.id !== g.id))
    setBusyId(null)
    router.refresh()
  }

  function addAll() {
    const ids = remaining.map((g) => g.id)
    startAll(async () => {
      const res = await addFromLibrary(locale, JSON.stringify(ids))
      if (res?.error) return
      setRemaining([])
      router.refresh()
    })
  }

  return (
    <div className="stokly-card mb-4 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">{t('quick_add_title')}</p>
            <p className="text-xs text-muted-foreground">{t('quick_add_hint')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={addAll}
          disabled={pendingAll || busyId !== null}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
        >
          {t('quick_add_all')}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {remaining.map((g) => {
          const busy = busyId === g.id || pendingAll
          return (
            <button
              key={g.id}
              type="button"
              disabled={busy}
              onClick={() => addOne(g)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5 text-primary transition-transform group-hover:rotate-90" />
              <span className="font-medium">{label(g)}</span>
              <span className="text-xs text-muted-foreground">
                {g.default_unit}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
