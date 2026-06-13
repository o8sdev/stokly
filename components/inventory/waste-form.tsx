'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  CalendarX,
  ChefHat,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { submitWaste } from '@/app/[locale]/app/(protected)/inventory/actions'
import type { IngredientOption } from '@/types/app'
import type { WasteCategory } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatMoney, formatQuantity } from '@/lib/utils'
import { cn } from '@/lib/utils'

const CATEGORY_META: Record<string, { icon: LucideIcon; key: string }> = {
  Spoilage: { icon: AlertTriangle, key: 'spoilage' },
  'Over-prep': { icon: ChefHat, key: 'over_prep' },
  Dropped: { icon: ArrowDownToLine, key: 'dropped' },
  Expired: { icon: CalendarX, key: 'expired' },
  Other: { icon: MoreHorizontal, key: 'other' },
}

// Above this waste value (qty × unit cost) a reason becomes mandatory — large
// write-offs are the ones worth documenting (they're how shrinkage gets hidden).
const LARGE_WASTE_VALUE = 50

export function WasteForm({
  locale,
  defaultDate,
  ingredients,
  categories,
  stockLevels,
  stockByLocation,
  consumptionLocations,
  defaultConsumptionId,
  multiLocation,
}: {
  locale: string
  defaultDate: string
  ingredients: IngredientOption[]
  categories: WasteCategory[]
  stockLevels: Record<string, number>
  stockByLocation: Record<
    string,
    { locationId: string; locationName: string; qty: number }[]
  >
  consumptionLocations: { id: string; name: string }[]
  defaultConsumptionId: string | null
  multiLocation: boolean
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [errKey, setErrKey] = useState<string | null>(null)

  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [locationId, setLocationId] = useState(defaultConsumptionId ?? '')

  const selected = ingredients.find((i) => i.id === ingredientId)
  const qtyNum = quantity === '' ? 0 : Number(quantity)
  const onHand = ingredientId ? (stockLevels[ingredientId] ?? 0) : 0
  const value = qtyNum * (selected?.cost_per_unit ?? 0)
  const overStock = !!selected && qtyNum > onHand
  // Large write-offs must carry a reason (documented shrinkage).
  const reasonRequired = value >= LARGE_WASTE_VALUE
  const reasonMissing = reasonRequired && !reason.trim()

  // Where this ingredient physically sits, and whether the routed waste station
  // actually holds enough (consumption is strict per-location). If the station
  // is short but stock exists elsewhere, suggest a transfer instead of a refuse.
  const wasteLocId = locationId || defaultConsumptionId || ''
  const wasteLocName =
    consumptionLocations.find((l) => l.id === wasteLocId)?.name ?? ''
  const locBreakdown = ingredientId ? (stockByLocation[ingredientId] ?? []) : []
  const atWasteLoc =
    locBreakdown.find((l) => l.locationId === wasteLocId)?.qty ?? 0
  const elsewhere = locBreakdown.filter(
    (l) => l.locationId !== wasteLocId && l.qty > 0
  )
  const transferSrc = elsewhere[0]
  const needsTransfer = !!selected && qtyNum > atWasteLoc && elsewhere.length > 0
  const transferHref = transferSrc
    ? `/app/inventory/transfer?ingredient=${ingredientId}&from=${transferSrc.locationId}&to=${wasteLocId}&qty=${Math.max(qtyNum - atWasteLoc, 0)}`
    : '/app/inventory/transfer'

  const payload = useMemo(
    () =>
      JSON.stringify({
        ingredient_id: ingredientId,
        quantity: qtyNum,
        waste_category_id: categoryId,
        occurred_at: date,
        location_id: locationId,
        reason,
        notes,
      }),
    [ingredientId, qtyNum, categoryId, date, locationId, reason, notes]
  )

  function save() {
    if (!ingredientId || !categoryId || qtyNum <= 0 || reasonMissing || pending)
      return
    const fd = new FormData()
    fd.set('payload', payload)
    startTransition(async () => {
      const res = await submitWaste(locale, {}, fd)
      if (res?.error) {
        setStatus('error')
        setErrKey(res.error)
        return
      }
      // Reset for the next entry (keep the date) and reload the log below.
      setIngredientId('')
      setQuantity('')
      setCategoryId('')
      setReason('')
      setNotes('')
      setStatus('ok')
      router.refresh()
    })
  }

  return (
    <div className="space-y-5 stokly-card p-5">
      <div className="space-y-2">
        <Label htmlFor="waste_date">{t('inventory.waste_date')}</Label>
        <Input
          id="waste_date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ingredient">{t('recipes.line_ingredient')}</Label>
        <select
          id="ingredient"
          value={ingredientId}
          onChange={(e) => {
            setIngredientId(e.target.value)
            setStatus('idle')
          }}
          className="flex h-[38px] w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
        >
          <option value="">{t('recipes.select_ingredient')}</option>
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        {selected && (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              {t('inventory.on_hand')}:{' '}
              <span className="font-mono tabular-nums text-foreground">
                {formatQuantity(onHand)} {selected.unit}
              </span>
            </p>
            {locBreakdown.length > 1 && (
              <p className="flex flex-wrap gap-x-3 gap-y-0.5">
                {locBreakdown.map((l) => (
                  <span key={l.locationId}>
                    {l.locationName}:{' '}
                    <span className="font-mono tabular-nums text-foreground">
                      {formatQuantity(l.qty)}
                    </span>
                  </span>
                ))}
              </p>
            )}
          </div>
        )}
      </div>

      {multiLocation && consumptionLocations.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="waste_location">{t('inventory.waste_location')}</Label>
          <select
            id="waste_location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="flex h-[38px] w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
          >
            {consumptionLocations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="quantity">{t('inventory.waste_quantity')}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="quantity"
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value)
              setStatus('idle')
            }}
            className="text-right font-mono tabular-nums"
          />
          <span className="w-12 text-sm text-muted-foreground">
            {selected?.unit ?? ''}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span
            className={cn(
              'flex items-center gap-1',
              overStock ? 'text-amber-600' : 'text-transparent'
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {overStock ? t('inventory.over_stock_warning') : ' '}
          </span>
          {value > 0 && (
            <span className="text-muted-foreground">
              {t('inventory.waste_value')}:{' '}
              <span className="font-mono tabular-nums text-foreground">
                {formatMoney(value)}
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('inventory.waste_category')}</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const meta = CATEGORY_META[c.name]
            const Icon = meta?.icon ?? MoreHorizontal
            const label = meta ? t(`waste_category.${meta.key}`) : c.name
            const isSel = categoryId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategoryId(c.id)
                  setStatus('idle')
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  isSel
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">
          {t('inventory.waste_reason')}
          {reasonRequired && <span className="text-destructive"> *</span>}
        </Label>
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('inventory.waste_reason_ph')}
          aria-invalid={reasonMissing}
        />
        {reasonRequired && (
          <p className="text-xs text-amber-600">
            {t('inventory.large_waste_hint')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t('inventory.notes')}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {needsTransfer && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="text-amber-800">
            {transferSrc
              ? t('inventory.waste_stock_elsewhere', {
                  from: transferSrc.locationName,
                  to: wasteLocName || t('inventory.waste_this_station'),
                })
              : t('inventory.waste_stock_elsewhere_generic')}
          </p>
          <Button asChild size="sm" variant="secondary" className="mt-2 gap-2">
            <Link href={transferHref}>
              <ArrowLeftRight className="h-4 w-4" />
              {t('inventory.move_stock')}
            </Link>
          </Button>
        </div>
      )}
      {status === 'error' && errKey !== 'stock_elsewhere' && (
        <p className="text-sm text-destructive">{t('common.error')}</p>
      )}
      {status === 'error' && errKey === 'stock_elsewhere' && !needsTransfer && (
        <p className="text-sm text-destructive">
          {t('inventory.waste_stock_elsewhere_generic')}
        </p>
      )}
      {status === 'ok' && (
        <p className="text-sm text-green-600">{t('inventory.waste_saved')} ✓</p>
      )}

      <Button
        type="button"
        onClick={save}
        disabled={
          !ingredientId || !categoryId || qtyNum <= 0 || reasonMissing || pending
        }
      >
        {pending ? t('common.saving') : t('inventory.log_waste')}
      </Button>
    </div>
  )
}
