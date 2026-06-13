'use client'

import { useMemo, useState } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Search, Minus, Plus } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { submitStockCount } from '@/app/[locale]/app/(protected)/inventory/actions'
import type { InventoryActionResult } from '@/app/[locale]/app/(protected)/inventory/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import { cn, formatQuantity } from '@/lib/utils'

export interface CountItem {
  id: string
  name: string
  unit: string
  // Current on-hand keyed by location id; the form shows the selected station's.
  byLocation: Record<string, number>
}

export function StockCountForm({
  locale,
  items,
  locations,
  defaultLocationId,
  blind = false,
}: {
  locale: string
  items: CountItem[]
  locations: { id: string; name: string }[]
  defaultLocationId: string
  blind?: boolean
}) {
  const t = useTranslations()
  const [query, setQuery] = useState('')
  // Map ingredientId -> counted value string.
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [countDate, setCountDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  // The station being counted. One station per submission — switching it starts
  // a fresh sheet (the current on-hand shown is per station).
  const [locationId, setLocationId] = useState(
    defaultLocationId || locations[0]?.id || ''
  )
  // Blind mode: the expected on-hand stays hidden while counting; the user taps
  // "Reveal variance" to compare expected vs counted before the final save, so
  // a count can't simply be typed to match the system number.
  const [revealed, setRevealed] = useState(false)
  const showExpected = !blind || revealed

  const action = submitStockCount.bind(null, locale)
  const [state, formAction] = useFormState<InventoryActionResult, FormData>(
    action,
    {}
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.name.toLowerCase().includes(q))
  }, [items, query])

  const payload = useMemo(
    () =>
      JSON.stringify({
        count_date: countDate,
        location_id: locationId,
        lines: Object.entries(counts)
          .filter(([, v]) => v !== '' && Number.isFinite(Number(v)))
          .map(([ingredient_id, v]) => ({
            ingredient_id,
            quantity: Number(v),
          })),
      }),
    [counts, countDate, locationId]
  )

  const filledCount = Object.values(counts).filter((v) => v !== '').length

  function step(id: string, delta: number) {
    setCounts((prev) => {
      const current = Number(prev[id] ?? '')
      const base = Number.isFinite(current) ? current : 0
      const next = Math.max(0, Math.round((base + delta) * 1000) / 1000)
      return { ...prev, [id]: String(next) }
    })
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="payload" value={payload} />

      <p className="text-sm text-muted-foreground">
        {t('inventory.count_help')}
      </p>

      {blind && !revealed && (
        <p className="rounded-md border border-dashed border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
          {t('inventory.blind_count_hint')}
        </p>
      )}
      {revealed && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
          {t('inventory.variance_revealed')}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="count_date">{t('inventory.count_date')}</Label>
        <Input
          id="count_date"
          type="date"
          value={countDate}
          onChange={(e) => setCountDate(e.target.value)}
          className="w-auto"
        />
      </div>

      {locations.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="count_location">
            {t('inventory.count_location')}
          </Label>
          <select
            id="count_location"
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value)
              setCounts({}) // a different station = a fresh count sheet
              setRevealed(false)
            }}
            className="flex h-[38px] w-full max-w-xs rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {t('inventory.count_location_hint')}
          </p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('ingredients.search_placeholder')}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((item) => {
          const changed = (counts[item.id] ?? '') !== ''
          return (
            <div
              key={item.id}
              className={cn(
                'flex min-h-[64px] items-center justify-between gap-3 rounded-lg border border-l-2 bg-card p-3 transition-colors',
                changed ? 'border-l-primary' : 'border-l-border'
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-base font-medium">{item.name}</p>
                {showExpected ? (
                  <p className="text-xs text-muted-foreground">
                    {t('inventory.current_stock')}:{' '}
                    <span className="font-mono tabular-nums">
                      {formatQuantity(item.byLocation[locationId] ?? 0)}
                    </span>{' '}
                    {item.unit}
                    {revealed &&
                      changed &&
                      (() => {
                        const exp = item.byLocation[locationId] ?? 0
                        const v =
                          Math.round((Number(counts[item.id]) - exp) * 1000) /
                          1000
                        return (
                          <span
                            className={cn(
                              'ml-2 font-mono font-semibold',
                              v === 0
                                ? 'text-muted-foreground'
                                : v > 0
                                  ? 'text-emerald-600'
                                  : 'text-destructive'
                            )}
                          >
                            ({v > 0 ? '+' : ''}
                            {formatQuantity(v)})
                          </span>
                        )
                      })()}
                  </p>
                ) : (
                  <p className="text-xs italic text-muted-foreground/70">
                    {t('inventory.count_hidden')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => step(item.id, -1)}
                  aria-label="−"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors active:scale-95 hover:bg-secondary"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0"
                  value={counts[item.id] ?? ''}
                  onChange={(e) =>
                    setCounts((prev) => ({
                      ...prev,
                      [item.id]: e.target.value,
                    }))
                  }
                  placeholder="0"
                  className="h-11 w-20 text-right font-mono text-[22px] tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => step(item.id, 1)}
                  aria-label="+"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors active:scale-95 hover:bg-secondary"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <span className="w-8 text-sm text-muted-foreground">
                  {item.unit}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{t('common.error')}</p>
      )}

      {/* Sticky action bar for mobile use in the stockroom. */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-2 border-t bg-background p-4 md:mx-0 md:rounded-lg md:border">
        <span className="text-sm text-muted-foreground">{filledCount}</span>
        <div className="flex gap-2">
          <Button asChild variant="outline" type="button">
            <Link href="/app/inventory">{t('common.cancel')}</Link>
          </Button>
          {blind && !revealed ? (
            <Button
              type="button"
              onClick={() => setRevealed(true)}
              disabled={filledCount === 0}
            >
              {t('inventory.reveal_variance')}
            </Button>
          ) : (
            <SubmitButton
              pendingText={t('common.saving')}
              disabled={filledCount === 0}
            >
              {t('common.save')}
            </SubmitButton>
          )}
        </div>
      </div>
    </form>
  )
}
