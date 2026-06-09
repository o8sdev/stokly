'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import {
  saveDailySalesItems,
  type SalesItemInput,
} from '@/app/[locale]/app/(protected)/sales/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/utils'

export interface MenuItem {
  id: string
  name: string
  price: number
}

interface Row {
  recipe_id: string
  qty: string
}

export function SalesItemEditor({
  locale,
  date,
  menuItems,
  initialItems,
  note: initialNote,
  locked = false,
}: {
  locale: string
  date: string
  menuItems: MenuItem[]
  initialItems: { recipe_id: string; quantity: number }[]
  note?: string | null
  locked?: boolean
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  const priceById = useMemo(
    () => new Map(menuItems.map((m) => [m.id, m.price])),
    [menuItems]
  )
  const nameById = useMemo(
    () => new Map(menuItems.map((m) => [m.id, m.name])),
    [menuItems]
  )

  const [rows, setRows] = useState<Row[]>(
    initialItems
      .filter((i) => priceById.has(i.recipe_id))
      .map((i) => ({ recipe_id: i.recipe_id, qty: String(i.quantity) }))
  )
  const [note, setNote] = useState(initialNote ?? '')

  const used = new Set(rows.map((r) => r.recipe_id))
  const available = menuItems.filter((m) => !used.has(m.id))

  const total = rows.reduce(
    (sum, r) => sum + (Number(r.qty) || 0) * (priceById.get(r.recipe_id) ?? 0),
    0
  )

  function addItem(id: string) {
    if (!id || used.has(id)) return
    setRows((rs) => [...rs, { recipe_id: id, qty: '1' }])
    setStatus('idle')
  }
  function setQty(id: string, qty: string) {
    setRows((rs) => rs.map((r) => (r.recipe_id === id ? { ...r, qty } : r)))
    setStatus('idle')
  }
  function removeRow(id: string) {
    setRows((rs) => rs.filter((r) => r.recipe_id !== id))
    setStatus('idle')
  }

  function save() {
    const items: SalesItemInput[] = rows
      .map((r) => ({ recipe_id: r.recipe_id, quantity: Number(r.qty) || 0 }))
      .filter((i) => i.quantity > 0)
    startTransition(async () => {
      const res = await saveDailySalesItems(locale, { date, note, items })
      if (res.success) {
        setStatus('ok')
        router.refresh()
      } else {
        setStatus('error')
      }
    })
  }

  return (
    <div className="stokly-card space-y-4 p-4">
      {locked && (
        <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          {t('sales.locked_readonly')}
        </p>
      )}
      {/* Add a menu item */}
      <div className={locked ? 'hidden' : 'space-y-2'}>
        <Label>{t('sales.add_item')}</Label>
        <div className="flex gap-2">
          <select
            value=""
            onChange={(e) => addItem(e.target.value)}
            disabled={locked || available.length === 0}
            className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
          >
            <option value="">
              {available.length === 0
                ? t('sales.all_added')
                : t('sales.select_item')}
            </option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.price > 0 ? ` — ${formatMoney(m.price)}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Line items */}
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {t('sales.no_items_yet')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">{t('sales.item')}</th>
                <th className="w-24 px-3 py-2 text-right font-semibold">
                  {t('sales.qty')}
                </th>
                <th className="w-28 px-3 py-2 text-right font-semibold">
                  {t('sales.line_total')}
                </th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const price = priceById.get(r.recipe_id) ?? 0
                const line = (Number(r.qty) || 0) * price
                return (
                  <tr
                    key={r.recipe_id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium">
                      {nameById.get(r.recipe_id)}
                      {price === 0 && (
                        <span className="ml-2 text-[11px] text-amber-600">
                          {t('sales.no_price')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={r.qty}
                        disabled={locked}
                        onChange={(e) => setQty(r.recipe_id, e.target.value)}
                        className="h-9 text-right font-mono"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {formatMoney(line)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {!locked && (
                        <button
                          type="button"
                          onClick={() => removeRow(r.recipe_id)}
                          aria-label={t('common.delete')}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-secondary/30">
                <td className="px-3 py-2.5 text-sm font-semibold" colSpan={2}>
                  {t('sales.revenue')}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold tabular-nums">
                  {formatMoney(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Note */}
      <div className="space-y-2">
        <Label htmlFor="sales_note">{t('sales.note')}</Label>
        <Input
          id="sales_note"
          value={note}
          disabled={locked}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {!locked && status === 'error' && (
        <p className="text-sm text-destructive">{t('common.error')}</p>
      )}
      {!locked && status === 'ok' && (
        <p className="text-sm text-green-600">{t('common.save')} ✓</p>
      )}

      {!locked && (
        <Button onClick={save} disabled={pending} className="gap-2">
          <Plus className="h-4 w-4" />
          {pending ? t('common.saving') : t('common.save')}
        </Button>
      )}
    </div>
  )
}
